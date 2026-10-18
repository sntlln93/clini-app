<?php

declare(strict_types=1);

namespace App\Http\Requests\ClinicalNotes;

use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreClinicalNoteRequest extends FormRequest
{
    /**
     * ICD-10 diagnoses a note can carry, besides its free text (#324).
     */
    public const int MAX_DIAGNOSES = 10;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:5000'],
            'icd10_code_ids' => ['sometimes', 'array', 'max:'.self::MAX_DIAGNOSES],
            'icd10_code_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('icd10_codes', 'id')->where(fn (Builder $query) => $this->allowedCodes($query)),
            ],
        ];
    }

    /**
     * The diagnoses in the order they were sent; none when the key is absent.
     *
     * @return list<int>
     */
    public function icd10CodeIds(): array
    {
        return array_values(array_map(intval(...), $this->array('icd10_code_ids')));
    }

    /**
     * A retired code can't be added to a new note.
     */
    protected function allowedCodes(Builder $query): void
    {
        $query->whereNull('deleted_at');
    }
}
