<?php

declare(strict_types=1);

namespace App\Actions\Prescriptions;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Prescriptions\PrescriptionEditionData;
use App\Models\Prescription;
use Illuminate\Support\Facades\DB;

/**
 * Replaces the diagnosis and the whole item list; `issued_at` is kept, since
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

            $prescription->update(['diagnosis' => $dto->diagnosis]);

            $prescription->items()->delete();

            foreach ($dto->items as $position => $item) {
                $prescription->items()->create(['position' => $position, ...$item->toArray()]);
            }

            // Bump updated_at even when only the items changed.
            $prescription->touch();

            return $prescription;
        });
    }
}
