<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Support\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
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
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::defaults(), 'confirmed'],
            'organization_name' => ['required', 'string', 'max:255'],
            'timezone' => ['required', 'string', 'timezone'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return PasswordPolicy::messages();
    }
}
