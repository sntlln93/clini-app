<?php

declare(strict_types=1);

namespace App\Http\Requests\Memberships;

use App\Support\DocumentNumberInput;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The DNI typed to accept a professional invitation (#417), as the registry takes it. Whether the invitation is valid
 * is the Action's: a malformed DNI spends no lookup.
 */
class LookUpInvitationDocumentRequest extends FormRequest
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
