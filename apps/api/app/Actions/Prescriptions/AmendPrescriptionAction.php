<?php

declare(strict_types=1);

namespace App\Actions\Prescriptions;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\Prescriptions\AllergyWarningOverrideData;
use App\Data\Prescriptions\MedicationAllergyScreeningData;
use App\Data\Prescriptions\PrescriptionAmendmentData;
use App\Data\Prescriptions\PrescriptionItemData;
use App\Enums\ClinicalAccessAction;
use App\Exceptions\Prescriptions\PrescriptionAmendmentUnchangedException;
use App\Exceptions\Prescriptions\PrescriptionAnnulledException;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionVersion;
use Illuminate\Support\Facades\DB;

/**
 * Adds the next version with the whole new item list and keeps every
 * previous one; `issued_at` stays, since an amendment corrects the record
 * rather than indicating the medication again (ADR 0019).
 *
 * @implements Action<PrescriptionAmendmentData>
 */
class AmendPrescriptionAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
        private readonly ScreenMedicationForAllergiesAction $screen,
        private readonly RecordAllergyWarningOverrideAction $recordOverride,
    ) {}

    /**
     * @param  PrescriptionAmendmentData  $dto
     */
    public function handle(Data $dto): Prescription
    {
        // An amendment that can't succeed says so before any allergy warning (#362); the lock below checks it again.
        $prescription = Prescription::query()->findOrFail($dto->prescriptionId);
        $this->currentVersionToAmend($prescription, $dto);

        // It indicates its whole item list again, so it is checked like a new record.
        $allergyMatches = $this->screen->handle(new MedicationAllergyScreeningData(
            organizationId: $prescription->organization_id,
            membershipId: $dto->membershipId,
            patientId: $prescription->patient_id,
            appointmentId: $prescription->appointment_id,
            items: $dto->items,
            confirmedAllergies: $dto->confirmedAllergies,
        ));

        return DB::transaction(function () use ($dto, $allergyMatches): Prescription {
            $prescription = Prescription::query()->lockForUpdate()->findOrFail($dto->prescriptionId);
            $current = $this->currentVersionToAmend($prescription, $dto);

            $version = $prescription->versions()->create([
                'version' => $current->version + 1,
                'membership_id' => $dto->membershipId,
                'reason' => $dto->reason,
            ]);

            foreach ($dto->items as $position => $item) {
                $version->items()->create(['position' => $position, ...$item->toArray()]);
            }

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $prescription->organization_id,
                membershipId: $dto->membershipId,
                patientId: $prescription->patient_id,
                action: ClinicalAccessAction::PrescriptionAmended,
                appointmentId: $prescription->appointment_id,
                prescriptionId: $prescription->id,
            ));

            $this->recordOverride->handle(new AllergyWarningOverrideData(
                organizationId: $prescription->organization_id,
                membershipId: $dto->membershipId,
                patientId: $prescription->patient_id,
                appointmentId: $prescription->appointment_id,
                prescriptionId: $prescription->id,
                prescriptionVersionId: $version->id,
                matches: $allergyMatches,
            ));

            return $prescription;
        });
    }

    /**
     * The version the amendment follows, unless the record is annulled or the amendment repeats its items.
     */
    private function currentVersionToAmend(Prescription $prescription, PrescriptionAmendmentData $dto): PrescriptionVersion
    {
        if ($prescription->annulment()->exists()) {
            throw new PrescriptionAnnulledException($prescription->id);
        }

        /** @var PrescriptionVersion $current */
        $current = $prescription->versions()->reorder('version', 'desc')->with('items')->firstOrFail();

        $currentItems = $current->items
            ->map(fn (PrescriptionItem $item): array => (new PrescriptionItemData(
                medication: $item->medication,
                presentation: $item->presentation,
                dosage: $item->dosage,
                quantity: $item->quantity,
            ))->toArray())
            ->all();
        $newItems = array_map(fn (PrescriptionItemData $item): array => $item->toArray(), $dto->items);

        if ($currentItems === $newItems) {
            throw new PrescriptionAmendmentUnchangedException($prescription->id, $current->version);
        }

        return $current;
    }
}
