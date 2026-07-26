<?php

declare(strict_types=1);

namespace App\Http\Requests\Patients;

use App\Enums\DocumentType;
use App\Enums\Sex;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePatientRequest extends FormRequest
{
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
            'document_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('patients')
                    ->where(fn ($query) => $query->where('document_type', $this->input('document_type')))
                    ->ignore($this->route('patient')),
            ],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'sex' => ['nullable', Rule::enum(Sex::class)],
            'birth_date' => ['nullable', 'date', 'before_or_equal:today'],
            'insurance_provider_id' => ['nullable', 'integer', 'exists:insurance_providers,id'],
        ];
    }
}
