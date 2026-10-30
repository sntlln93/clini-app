<?php

declare(strict_types=1);

namespace App\Http\Requests\ClinicalAccess;

use Illuminate\Foundation\Http\FormRequest;

/**
 * The code the patient shared, as the professional typed it (#364): with or without the dash, in any case.
 */
class RedeemAccessCodeRequest extends FormRequest
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
            'code' => ['required', 'string', 'max:32'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required' => 'Ingresá el código del paciente.',
            'code.max' => 'El código tiene 8 caracteres.',
        ];
    }
}
