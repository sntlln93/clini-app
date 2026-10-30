<?php

declare(strict_types=1);

namespace App\Http\Requests\Medications;

use Illuminate\Foundation\Http\FormRequest;

class SearchMedicationsRequest extends FormRequest
{
    /**
     * The panel asks from five characters on: a shorter term would list too much to suggest, and ask the national
     * vademecum for nothing useful.
     */
    public const int MIN_TERM_LENGTH = 5;

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
            'q' => ['required', 'string', 'min:'.self::MIN_TERM_LENGTH, 'max:100'],
        ];
    }

    public function term(): string
    {
        return $this->string('q')->trim()->toString();
    }

    /**
     * The length counts without the spaces around it.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('q'))) {
            $this->merge(['q' => trim($this->input('q'))]);
        }
    }
}
