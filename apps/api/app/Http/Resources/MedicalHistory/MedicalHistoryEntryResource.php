<?php

declare(strict_types=1);

namespace App\Http\Resources\MedicalHistory;

use App\Models\MedicalHistoryEntry;
use App\Models\MedicalHistoryEntryVersion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes one allergy or antecedent (#361): its current text with every earlier version, since it is append-only (ADR
 * 0019), when and why it was withdrawn, and its author's name. The controller eager-loads what it renders, see
 * MedicalHistoryController::ENTRY_RELATIONS.
 *
 * @mixin MedicalHistoryEntry
 */
class MedicalHistoryEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $entry = $this->entry();
        /** @var MedicalHistoryEntryVersion $current */
        $current = $entry->versions->last();
        $withdrawal = $entry->withdrawal;

        return [
            'id' => $entry->id,
            'appointment_id' => $entry->appointment_id,
            'patient_id' => $entry->patient_id,
            'membership_id' => $entry->membership_id,
            'category' => $entry->category,
            'created_at' => $entry->created_at,
            'version' => $current->version,
            'amended_at' => $current->version > 1 ? $current->created_at : null,
            ...self::content($current),
            'withdrawal' => $withdrawal === null ? null : [
                'reason' => $withdrawal->reason,
                'created_at' => $withdrawal->created_at,
            ],
            'versions' => $entry->versions->map(fn (MedicalHistoryEntryVersion $version): array => [
                'version' => $version->version,
                'reason' => $version->reason,
                'created_at' => $version->created_at,
                ...self::content($version),
            ])->values(),
            'author_name' => $entry->author?->user?->name,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function content(MedicalHistoryEntryVersion $version): array
    {
        return [
            'description' => $version->description,
            'reaction' => $version->reaction,
            'severity' => $version->severity,
            'approximate_date' => $version->approximate_date,
        ];
    }

    private function entry(): MedicalHistoryEntry
    {
        /** @var MedicalHistoryEntry $entry */
        $entry = $this->resource;

        return $entry;
    }
}
