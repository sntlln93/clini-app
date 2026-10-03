<?php

declare(strict_types=1);

namespace App\Actions\Prescriptions;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Prescriptions\PrescriptionDraftData;
use App\Models\Prescription;
use Illuminate\Support\Facades\DB;

/**
 * @implements Action<PrescriptionDraftData>
 */
class IssuePrescriptionAction implements Action
{
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
                'diagnosis' => $dto->diagnosis,
                'issued_at' => now(),
            ]);

            foreach ($dto->items as $position => $item) {
                $prescription->items()->create(['position' => $position, ...$item->toArray()]);
            }

            return $prescription;
        });
    }
}
