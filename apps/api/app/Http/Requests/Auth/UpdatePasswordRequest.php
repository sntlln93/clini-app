<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Support\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * Changing one's own password (#389) asks for the current one and nothing else, not even the second factor: the
 * session is already signed in, and a reset by mail never opens one.
 */
class UpdatePasswordRequest extends FormRequest
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
            'current_password' => ['required', 'string', 'current_password:web'],
            'password' => ['required', 'string', Password::defaults(), 'confirmed'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'current_password.required' => 'Ingresá tu contraseña actual.',
            'current_password.current_password' => 'La contraseña actual no es correcta.',
            ...PasswordPolicy::messages(),
        ];
    }
}
