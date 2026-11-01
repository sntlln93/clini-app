<?php

declare(strict_types=1);

namespace App\Http\Requests\Professionals;

use App\Enums\HealthProfession;
use App\Enums\Province;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProfessionalLicenseRequest extends FormRequest
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
            'number' => ['required', 'string', 'max:40', 'regex:/\d/'],
            'province' => ['required', Rule::enum(Province::class)],
            'profession' => ['required', Rule::enum(HealthProfession::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'number.regex' => 'La matrícula tiene que tener al menos un número.',
        ];
    }

    public function province(): Province
    {
        return Province::from($this->string('province')->toString());
    }

    public function profession(): HealthProfession
    {
        return HealthProfession::from($this->string('profession')->toString());
    }
}
