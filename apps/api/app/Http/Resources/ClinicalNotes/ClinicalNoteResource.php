<?php

declare(strict_types=1);

namespace App\Http\Resources\ClinicalNotes;

use App\Models\ClinicalNote;
use App\Models\ClinicalNoteVersion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The current text plus the whole version history, since a note is
 * append-only (ADR 0019). The controller eager-loads the versions and the
 * annulment, see ClinicalNoteController::RELATIONS.
 *
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
        /** @var ClinicalNoteVersion $current */
        $current = $clinicalNote->versions->last();
        $annulment = $clinicalNote->annulment;

        return [
            'id' => $clinicalNote->id,
            'appointment_id' => $clinicalNote->appointment_id,
            'membership_id' => $clinicalNote->membership_id,
            'body' => $current->body,
            'version' => $current->version,
            'created_at' => $clinicalNote->created_at,
            'amended_at' => $current->version > 1 ? $current->created_at : null,
            'annulment' => $annulment === null ? null : [
                'reason' => $annulment->reason,
                'created_at' => $annulment->created_at,
            ],
            'versions' => $clinicalNote->versions->map(fn (ClinicalNoteVersion $version) => [
                'version' => $version->version,
                'body' => $version->body,
                'reason' => $version->reason,
                'created_at' => $version->created_at,
            ])->values(),
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
