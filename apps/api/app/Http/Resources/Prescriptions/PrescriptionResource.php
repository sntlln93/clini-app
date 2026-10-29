<?php

declare(strict_types=1);

namespace App\Http\Resources\Prescriptions;

use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionVersion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes one indicated-medication record with its items: no patient identity,
 * since nothing prints it (issue #319), and its author's name only on the
 * patient-scoped listing, which holds every author's (#359). The
 * current items come with every earlier version, since the record is
 * append-only (ADR 0019), and an annulled one says when and why (#344). The
 * controller eager-loads the versions with their items and the annulment,
 * see PrescriptionController::RELATIONS.
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
        $annulment = $prescription->annulment;

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
            'annulment' => $annulment === null ? null : [
                'reason' => $annulment->reason,
                'created_at' => $annulment->created_at,
            ],
            'versions' => $prescription->versions->map(fn (PrescriptionVersion $version) => [
                'version' => $version->version,
                'reason' => $version->reason,
                'created_at' => $version->created_at,
                'items' => $this->items($version),
            ])->values(),
            // Only when the controller eager-loads it (the patient-scoped listing does; on one appointment every
            // record shares one author), as ClinicalNoteResource does.
            'author_name' => $this->whenLoaded('author', fn () => $prescription->author?->user?->name),
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
