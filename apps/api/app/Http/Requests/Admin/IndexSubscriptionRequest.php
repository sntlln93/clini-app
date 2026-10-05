<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * When `grace_ending_within_days` is present `status` is ignored (the
 * filter already implies `grace`) — never a 422, never an empty
 * intersection.
 */
class IndexSubscriptionRequest extends FormRequest
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
            'q' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', 'in:pending,active,grace,expired,cancelled'],
            'grace_ending_within_days' => ['nullable', 'integer', 'min:1', 'max:30'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
