<?php

declare(strict_types=1);

namespace App\Actions\Prescriptions;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
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
    ) {}

    /**
     * @param  PrescriptionAmendmentData  $dto
     */
    public function handle(Data $dto): Prescription
    {
        return DB::transaction(function () use ($dto): Prescription {
            $prescription = Prescription::query()->lockForUpdate()->findOrFail($dto->prescriptionId);

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

            return $prescription;
        });
    }
}
