<?php

declare(strict_types=1);

namespace App\Actions\Prescriptions;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Prescriptions\PrescriptionDraftData;
use App\Models\Prescription;
use Illuminate\Support\Facades\DB;

/**
 * The items are the record's version 1 (ADR 0019).
 *
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
                'issued_at' => now(),
            ]);

            $version = $prescription->versions()->create([
                'version' => 1,
                'membership_id' => $dto->membershipId,
            ]);

            foreach ($dto->items as $position => $item) {
                $version->items()->create(['position' => $position, ...$item->toArray()]);
            }

            return $prescription;
        });
    }
}
