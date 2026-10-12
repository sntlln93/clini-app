<?php

declare(strict_types=1);

namespace App\Http\Requests\Availability;

use App\Enums\AvailabilityExceptionType;
use App\Rules\Iso8601Instant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAvailabilityExceptionRequest extends FormRequest
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
            'type' => ['required', Rule::enum(AvailabilityExceptionType::class)],
            'start_at' => ['required', new Iso8601Instant],
            'end_at' => ['required', new Iso8601Instant, 'after:start_at'],
            'reason' => ['nullable', 'string', 'max:255'],
            'merge' => ['sometimes', 'boolean'],
        ];
    }
}
