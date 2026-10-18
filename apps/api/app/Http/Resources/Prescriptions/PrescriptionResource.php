<?php

declare(strict_types=1);

namespace App\Http\Resources\Prescriptions;

use App\Models\Prescription;
use App\Models\PrescriptionItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes one indicated-medication record with its items only: no patient
 * identity or author details, since nothing prints it (issue #319). The
 * controller eager-loads the items, see PrescriptionController::RELATIONS.
 *
 * @mixin Prescription
 */
class PrescriptionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $prescription = $this->prescription();

        return [
            'id' => $prescription->id,
            'appointment_id' => $prescription->appointment_id,
            'patient_id' => $prescription->patient_id,
            'membership_id' => $prescription->membership_id,
            'issued_at' => $prescription->issued_at,
            'created_at' => $prescription->created_at,
            'updated_at' => $prescription->updated_at,
            'items' => $prescription->items->map(fn (PrescriptionItem $item) => [
                'id' => $item->id,
                'position' => $item->position,
                'medication' => $item->medication,
                'presentation' => $item->presentation,
                'dosage' => $item->dosage,
                'quantity' => $item->quantity,
            ])->values(),
        ];
    }

    private function prescription(): Prescription
    {
        /** @var Prescription $prescription */
        $prescription = $this->resource;

        return $prescription;
    }
}
