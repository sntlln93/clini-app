<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Starting a setup, turning the factor off and regenerating the recovery
 * codes all ask for the current password (#357), so a session left open on
 * a shared computer can't change the account's second factor.
 */
class TwoFactorPasswordRequest extends FormRequest
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
            'password' => ['required', 'string', 'current_password:web'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'password.required' => 'Ingresá tu contraseña.',
            'password.current_password' => 'La contraseña no es correcta.',
        ];
    }
}
