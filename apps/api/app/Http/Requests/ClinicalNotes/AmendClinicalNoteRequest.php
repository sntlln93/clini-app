<?php

declare(strict_types=1);

namespace App\Http\Requests\ClinicalNotes;

use Illuminate\Database\Query\Builder;

/**
 * The whole new version: its text and, when sent, its diagnoses (#324),
 * plus an optional reason. Leaving `icd10_code_ids` out keeps the current
 * diagnoses, so correcting only the text never drops them by accident.
 */
class AmendClinicalNoteRequest extends StoreClinicalNoteRequest
{
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
     * Any catalog code, retired ones included: a retired code may stay on
     * the note, and only AmendClinicalNoteAction, once the author is
     * authorized and the note locked, knows whether it is being kept or
     * added. Reading the note here would answer before authorization.
     */
    protected function allowedCodes(Builder $query): void {}
}
