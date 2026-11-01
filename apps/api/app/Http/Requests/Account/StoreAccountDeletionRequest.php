<?php

declare(strict_types=1);

namespace App\Http\Requests\Account;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Deleting one's account (#384) asks for the password and, with the second factor on, a code from the app or a
 * recovery code. Only the code's shape is checked here; whether it is right is the Action's business, under the
 * user's lock.
 */
class StoreAccountDeletionRequest extends FormRequest
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
        $twoFactor = $this->user() instanceof User && $this->user()->hasTwoFactorEnabled();

        return [
            'password' => ['required', 'string', 'current_password:web'],
            'code' => [Rule::requiredIf($twoFactor && ! $this->filled('recovery_code')), 'prohibits:recovery_code', 'nullable', 'string', 'regex:/^\s*\d{3}\s?\d{3}\s*$/'],
            'recovery_code' => ['nullable', 'string', 'max:32'],
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
            'code.required' => 'Ingresá el código de tu app de autenticación.',
            'code.regex' => 'El código tiene 6 números.',
            'code.prohibits' => 'Enviá el código de la app o uno de recuperación, no los dos.',
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

        return is_string($code) && $code !== '' ? $code : null;
    }
}
