<?php

declare(strict_types=1);

namespace App\Http\Resources\ClinicalNotes;

use App\Models\ClinicalNote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ClinicalNote
 */
class ClinicalNoteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $clinicalNote = $this->clinicalNote();

        return [
            'id' => $clinicalNote->id,
            'appointment_id' => $clinicalNote->appointment_id,
            'membership_id' => $clinicalNote->membership_id,
            'body' => $clinicalNote->body,
            'created_at' => $clinicalNote->created_at,
            'updated_at' => $clinicalNote->updated_at,
            // Only present when the controller eager-loads these relations
            // (the patient-scoped listing does; the appointment-scoped one
            // doesn't need them, since every note there shares one author).
            'author_name' => $this->whenLoaded('author', fn () => $clinicalNote->author?->user?->name),
            'appointment_date' => $this->whenLoaded('appointment', fn () => $clinicalNote->appointment?->start_at),
        ];
    }

    private function clinicalNote(): ClinicalNote
    {
        /** @var ClinicalNote $clinicalNote */
        $clinicalNote = $this->resource;

        return $clinicalNote;
    }
}
