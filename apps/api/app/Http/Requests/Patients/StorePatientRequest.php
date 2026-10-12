<?php

declare(strict_types=1);

namespace App\Http\Requests\Patients;

use App\Enums\DocumentType;
use App\Enums\Sex;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePatientRequest extends FormRequest
{
    // A member number only means something next to its provider, so it's dropped when there is none.
    protected function prepareForValidation(): void
    {
        if (blank($this->input('insurance_provider_id'))) {
            $this->merge(['insurance_member_number' => null]);
        }
    }

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
            'name' => ['required', 'string', 'max:255'],
            'document_type' => ['required', Rule::enum(DocumentType::class)],
            // Not unique: an existing pair is reused by find-or-create, never rejected here.
            'document_number' => ['required', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'sex' => ['nullable', Rule::enum(Sex::class)],
            'birth_date' => ['nullable', 'date', 'before_or_equal:today'],
            'insurance_provider_id' => ['nullable', 'integer', 'exists:insurance_providers,id'],
            'insurance_member_number' => ['nullable', 'required_with:insurance_provider_id', 'string', 'max:50'],
        ];
    }
}
