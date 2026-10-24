<?php

declare(strict_types=1);

namespace App\Http\Resources\ClinicalAccess;

use App\Models\ClinicalAccessLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One row of a patient's access trail, on their page and in the export (#325, ADR 0022): who, what, when, and which
 * appointment, note, medication or export it touched. The reason of an exceptional access goes as the listed one,
 * never the professional's own words, which can carry clinical content; the content itself is in the history.
 *
 * @mixin ClinicalAccessLog
 */
class ClinicalAccessTrailEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $entry = $this->entry();
        $appointment = $entry->appointment;
        $export = $entry->export;

        return [
            'id' => $entry->id,
            'created_at' => $entry->created_at,
            'action' => $entry->action,
            'professional' => [
                'membership_id' => $entry->membership_id,
                'name' => $entry->accessor?->user?->name,
            ],
            'reason' => $entry->reason,
            'appointment' => $appointment === null ? null : [
                'id' => $appointment->id,
                'start_at' => $appointment->start_at,
            ],
            'clinical_note_id' => $entry->clinical_note_id,
            'prescription_id' => $entry->prescription_id,
            'export' => $export === null ? null : [
                'id' => $export->id,
                'scope' => $export->scope,
                'format' => $export->format,
            ],
        ];
    }

    private function entry(): ClinicalAccessLog
    {
        /** @var ClinicalAccessLog $entry */
        $entry = $this->resource;

        return $entry;
    }
}
