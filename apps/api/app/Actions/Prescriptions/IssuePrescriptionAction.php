<?php

declare(strict_types=1);

namespace App\Actions\Prescriptions;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\Prescriptions\PrescriptionDraftData;
use App\Enums\ClinicalAccessAction;
use App\Models\Prescription;
use Illuminate\Support\Facades\DB;

/**
 * The items are the record's version 1 (ADR 0019), and the access log records
 * who indicated them (#325).
 *
 * @implements Action<PrescriptionDraftData>
 */
class IssuePrescriptionAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  PrescriptionDraftData  $dto
     */
    public function handle(Data $dto): Prescription
    {
        return DB::transaction(function () use ($dto): Prescription {
            $prescription = Prescription::create([
                'organization_id' => $dto->organizationId,
                'appointment_id' => $dto->appointmentId,
                'patient_id' => $dto->patientId,
                'membership_id' => $dto->membershipId,
                'issued_at' => now(),
            ]);

            $version = $prescription->versions()->create([
                'version' => 1,
                'membership_id' => $dto->membershipId,
            ]);

            foreach ($dto->items as $position => $item) {
                $version->items()->create(['position' => $position, ...$item->toArray()]);
            }

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $prescription->organization_id,
                membershipId: $dto->membershipId,
                patientId: $prescription->patient_id,
                action: ClinicalAccessAction::PrescriptionIssued,
                appointmentId: $prescription->appointment_id,
                prescriptionId: $prescription->id,
            ));

            return $prescription;
        });
    }
}
