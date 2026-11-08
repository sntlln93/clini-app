<?php

declare(strict_types=1);

namespace App\Http\Requests\Professionals;

use App\Support\DocumentNumberInput;
use Illuminate\Foundation\Http\FormRequest;

/**
 * A DNI as the registry takes it: 7 or 8 digits, written with or without dots or spaces. Once loaded it is never taken
 * away from here (#417).
 */
class UpdateProfessionalDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('document_number')) {
            $this->merge(['document_number' => DocumentNumberInput::digits($this->input('document_number'))]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'document_number' => ['required', 'string', DocumentNumberInput::RULE],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'document_number.required' => 'Ingresá tu DNI.',
            'document_number.regex' => DocumentNumberInput::MESSAGE,
        ];
    }

    public function documentNumber(): string
    {
        return $this->string('document_number')->toString();
    }
}
