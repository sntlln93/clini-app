<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Only the shape of the code is checked here; whether it is right is the
 * Action's business, under the user's lock.
 */
class TwoFactorChallengeRequest extends FormRequest
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
            'code' => ['required_without:recovery_code', 'prohibits:recovery_code', 'nullable', 'string', 'regex:/^\s*\d{3}\s?\d{3}\s*$/'],
            'recovery_code' => ['required_without:code', 'nullable', 'string', 'max:32'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required_without' => 'Ingresá el código de tu app de autenticación.',
            'code.regex' => 'El código tiene 6 números.',
            'code.prohibits' => 'Enviá el código de la app o uno de recuperación, no los dos.',
            'recovery_code.required_without' => 'Ingresá un código de recuperación.',
        ];
    }

    public function code(): ?string
    {
        $code = $this->input('code');

        return is_string($code) ? (string) preg_replace('/\s+/', '', $code) : null;
    }

    public function recoveryCode(): ?string
    {
        $code = $this->input('recovery_code');

        return is_string($code) ? $code : null;
    }
}
