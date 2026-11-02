<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Support\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * The link carries the token alone; the address is typed again on the page, so it never travels in a URL (#389).
 */
class ResetPasswordRequest extends FormRequest
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
            'token' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', Password::defaults(), 'confirmed'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.required' => 'Ingresá tu correo.',
            'email.email' => 'El correo no es válido.',
            ...PasswordPolicy::messages(),
        ];
    }
}
