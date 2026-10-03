<?php

declare(strict_types=1);

namespace App\Http\Resources\Prescriptions;

use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\Specialty;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes a prescription together with everything its printable view needs
 * (patient identity, author name and specialties) — the controller always
 * eager-loads those relations, see PrescriptionController::RELATIONS.
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
            'diagnosis' => $prescription->diagnosis,
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
            'patient_name' => $prescription->patient?->name,
            'patient_document_type' => $prescription->patient?->document_type,
            'patient_document_number' => $prescription->patient?->document_number,
            'author_name' => $prescription->author?->user?->name,
            'author_specialties' => $prescription->author?->specialties
                ->map(fn (Specialty $specialty) => $specialty->name)
                ->values() ?? [],
        ];
    }

    private function prescription(): Prescription
    {
        /** @var Prescription $prescription */
        $prescription = $this->resource;

        return $prescription;
    }
}
