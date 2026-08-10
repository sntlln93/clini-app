<?php

declare(strict_types=1);

namespace App\Http\Requests\Availability;

use App\Enums\AvailabilityExceptionType;
use App\Models\Membership;
use App\Rules\BelongsToCurrentOrganization;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAvailabilityExceptionRequest extends FormRequest
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
            'membership_id' => ['nullable', new BelongsToCurrentOrganization(Membership::class)],
            'type' => ['required', Rule::enum(AvailabilityExceptionType::class)],
            'start_at' => ['required', 'date'],
            'end_at' => ['required', 'date', 'after:start_at'],
            'reason' => ['nullable', 'string', 'max:255'],
            'merge' => ['sometimes', 'boolean'],
        ];
    }
}
