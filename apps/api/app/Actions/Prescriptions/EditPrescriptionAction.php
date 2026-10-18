<?php

declare(strict_types=1);

namespace App\Actions\Prescriptions;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Prescriptions\PrescriptionEditionData;
use App\Models\Prescription;
use Illuminate\Support\Facades\DB;

/**
 * Replaces the whole item list; `issued_at` is kept, since
 * an edit corrects the prescription rather than issuing a new one.
 *
 * @implements Action<PrescriptionEditionData>
 */
class EditPrescriptionAction implements Action
{
    /**
     * @param  PrescriptionEditionData  $dto
     */
    public function handle(Data $dto): Prescription
    {
        return DB::transaction(function () use ($dto): Prescription {
            $prescription = Prescription::query()->lockForUpdate()->findOrFail($dto->prescriptionId);

            $prescription->items()->delete();

            foreach ($dto->items as $position => $item) {
                $prescription->items()->create(['position' => $position, ...$item->toArray()]);
            }

            // The items are the whole payload, so bump updated_at by hand.
            $prescription->touch();

            return $prescription;
        });
    }
}
