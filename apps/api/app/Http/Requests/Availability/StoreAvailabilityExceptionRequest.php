<?php

declare(strict_types=1);

namespace App\Http\Requests\Availability;

use App\Enums\AvailabilityExceptionType;
use App\Models\Membership;
use App\Rules\BelongsToCurrentOrganization;
use App\Rules\Iso8601Instant;
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
            'type' => [
                'required',
                Rule::enum(AvailabilityExceptionType::class),
                // The published schedule ignores an organization-wide extra:
                // "extra" adds hours to one professional's week.
                Rule::when(! $this->filled('membership_id'), [Rule::notIn([AvailabilityExceptionType::Extra->value])]),
            ],
            'start_at' => ['required', new Iso8601Instant],
            'end_at' => ['required', new Iso8601Instant, 'after:start_at'],
            'reason' => ['nullable', 'string', 'max:255'],
            'merge' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'type.not_in' => 'Las horas adicionales son de un profesional. Una excepción para todo el consultorio solo puede ser «Sin atención».',
        ];
    }
}
