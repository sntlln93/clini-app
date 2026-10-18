<?php

declare(strict_types=1);

namespace App\Http\Requests\ClinicalNotes;

use App\Models\ClinicalNote;
use App\Models\ClinicalNoteDiagnosis;
use App\Models\ClinicalNoteVersion;
use Illuminate\Database\Query\Builder;

/**
 * The whole new version: its text and, when sent, its diagnoses (#324),
 * plus an optional reason. Leaving `icd10_code_ids` out keeps the current
 * diagnoses, so correcting only the text never drops them by accident.
 */
class AmendClinicalNoteRequest extends StoreClinicalNoteRequest
{
    /**
     * The current version's codes, looked up once for every item's rule.
     *
     * @var list<int>|null
     */
    private ?array $currentCodeIds = null;

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return list<int>|null
     */
    public function amendedIcd10CodeIds(): ?array
    {
        return $this->has('icd10_code_ids') ? $this->icd10CodeIds() : null;
    }

    public function reason(): ?string
    {
        $reason = $this->string('reason')->trim()->toString();

        return $reason === '' ? null : $reason;
    }

    /**
     * A code retired since the current version was written can stay on the
     * note, but can't be added to it.
     */
    protected function allowedCodes(Builder $query): void
    {
        $currentCodeIds = $this->currentCodeIds ??= $this->currentVersionCodeIds();

        $query->where(fn (Builder $query) => $query->whereNull('deleted_at')->orWhereIn('id', $currentCodeIds));
    }

    /**
     * @return list<int>
     */
    private function currentVersionCodeIds(): array
    {
        /** @var ClinicalNote $clinicalNote */
        $clinicalNote = $this->route('clinicalNote');

        /** @var ClinicalNoteVersion|null $current */
        $current = $clinicalNote->versions()->reorder('version', 'desc')->first();

        return $current === null ? [] : array_values($current->diagnoses
            ->map(fn (ClinicalNoteDiagnosis $diagnosis): int => $diagnosis->icd10_code_id)
            ->all());
    }
}
