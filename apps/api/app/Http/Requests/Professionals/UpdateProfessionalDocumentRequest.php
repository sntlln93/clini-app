<?php

declare(strict_types=1);

namespace App\Http\Requests\Professionals;

use Illuminate\Foundation\Http\FormRequest;

/**
 * A DNI as the registry takes it: 7 or 8 digits, written with or without dots or spaces. Null or empty takes it away.
 */
class UpdateProfessionalDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $documentNumber = $this->input('document_number');

        if (is_string($documentNumber)) {
            $digits = (string) preg_replace('/[\s.]/u', '', $documentNumber);

            $this->merge(['document_number' => $digits === '' ? null : $digits]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'document_number' => ['present', 'nullable', 'string', 'regex:/^\d{7,8}$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'document_number.regex' => 'El DNI tiene que tener 7 u 8 números.',
        ];
    }

    public function documentNumber(): ?string
    {
        $documentNumber = $this->validated('document_number');

        return is_string($documentNumber) ? $documentNumber : null;
    }
}
