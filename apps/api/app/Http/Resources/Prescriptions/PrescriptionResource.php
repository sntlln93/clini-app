<?php

declare(strict_types=1);

namespace App\Http\Resources\Prescriptions;

use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionVersion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes one indicated-medication record with its items only: no patient
 * identity or author details, since nothing prints it (issue #319). The
 * current items come with every earlier version, since the record is
 * append-only (ADR 0019). The controller eager-loads the versions with
 * their items, see PrescriptionController::RELATIONS.
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
        /** @var PrescriptionVersion $current */
        $current = $prescription->versions->last();

        return [
            'id' => $prescription->id,
            'appointment_id' => $prescription->appointment_id,
            'patient_id' => $prescription->patient_id,
            'membership_id' => $prescription->membership_id,
            'issued_at' => $prescription->issued_at,
            'created_at' => $prescription->created_at,
            'version' => $current->version,
            'amended_at' => $current->version > 1 ? $current->created_at : null,
            'items' => $this->items($current),
            'versions' => $prescription->versions->map(fn (PrescriptionVersion $version) => [
                'version' => $version->version,
                'reason' => $version->reason,
                'created_at' => $version->created_at,
                'items' => $this->items($version),
            ])->values(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function items(PrescriptionVersion $version): array
    {
        return $version->items->map(fn (PrescriptionItem $item) => [
            'id' => $item->id,
            'position' => $item->position,
            'medication' => $item->medication,
            'presentation' => $item->presentation,
            'dosage' => $item->dosage,
            'quantity' => $item->quantity,
        ])->values()->all();
    }

    private function prescription(): Prescription
    {
        /** @var Prescription $prescription */
        $prescription = $this->resource;

        return $prescription;
    }
}
