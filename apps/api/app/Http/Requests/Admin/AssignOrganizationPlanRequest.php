<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\Plan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignOrganizationPlanRequest extends FormRequest
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
            'assigned_plan' => ['present', 'nullable', Rule::in([Plan::Center->value])],
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }
}
