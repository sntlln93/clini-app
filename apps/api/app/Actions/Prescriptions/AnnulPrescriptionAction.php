<?php

declare(strict_types=1);

namespace App\Actions\Prescriptions;

use App\Actions\ClinicalAccess\RecordClinicalAccessAction;
use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\ClinicalAccess\ClinicalAccessEntryData;
use App\Data\Prescriptions\PrescriptionAnnulmentData;
use App\Enums\ClinicalAccessAction;
use App\Exceptions\Prescriptions\PrescriptionAnnulledException;
use App\Models\Prescription;
use Illuminate\Support\Facades\DB;

/**
 * Says the indicated medication no longer counts (#344): it stays in the
 * history with every version, marked as annulled, as a note does (ADR 0019).
 *
 * @implements Action<PrescriptionAnnulmentData>
 */
class AnnulPrescriptionAction implements Action
{
    public function __construct(
        private readonly RecordClinicalAccessAction $record,
    ) {}

    /**
     * @param  PrescriptionAnnulmentData  $dto
     */
    public function handle(Data $dto): Prescription
    {
        return DB::transaction(function () use ($dto): Prescription {
            $prescription = Prescription::query()->lockForUpdate()->findOrFail($dto->prescriptionId);

            if ($prescription->annulment()->exists()) {
                throw new PrescriptionAnnulledException($prescription->id);
            }

            $prescription->annulment()->create([
                'membership_id' => $dto->membershipId,
                'reason' => $dto->reason,
            ]);

            $this->record->handle(new ClinicalAccessEntryData(
                organizationId: $prescription->organization_id,
                membershipId: $dto->membershipId,
                patientId: $prescription->patient_id,
                action: ClinicalAccessAction::PrescriptionAnnulled,
                appointmentId: $prescription->appointment_id,
                prescriptionId: $prescription->id,
            ));

            return $prescription;
        });
    }
}
