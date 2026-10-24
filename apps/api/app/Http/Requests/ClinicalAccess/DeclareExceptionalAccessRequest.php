<?php

declare(strict_types=1);

namespace App\Http\Requests\ClinicalAccess;

use App\Enums\ClinicalAccessReason;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The reason to open a patient's history without an appointment near today (#325). The text is optional, except for
 * «otro», which says nothing on its own.
 */
class DeclareExceptionalAccessRequest extends FormRequest
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
            'reason' => ['required', Rule::enum(ClinicalAccessReason::class)],
            'reason_detail' => [
                Rule::requiredIf(fn (): bool => $this->input('reason') === ClinicalAccessReason::Other->value),
                'nullable',
                'string',
                'min:3',
                'max:500',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Elegí un motivo.',
            'reason.enum' => 'Elegí un motivo de la lista.',
            'reason_detail.required' => 'Contá el motivo en pocas palabras.',
            'reason_detail.min' => 'Escribí al menos 3 caracteres.',
            'reason_detail.max' => 'Escribí 500 caracteres como máximo.',
        ];
    }

    public function accessReason(): ClinicalAccessReason
    {
        /** @var ClinicalAccessReason $reason */
        $reason = $this->enum('reason', ClinicalAccessReason::class);

        return $reason;
    }

    public function reasonDetail(): ?string
    {
        $detail = $this->string('reason_detail')->trim()->toString();

        return $detail === '' ? null : $detail;
    }
}
