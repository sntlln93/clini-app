<?php

declare(strict_types=1);

namespace App\Http\Requests\Organizations;

use App\Enums\Province;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOrganizationProvinceRequest extends FormRequest
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
            'province' => ['present', 'nullable', Rule::enum(Province::class)],
        ];
    }

    public function province(): ?Province
    {
        $province = $this->validated('province');

        return is_string($province) ? Province::from($province) : null;
    }
}
