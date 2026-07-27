<?php

declare(strict_types=1);

namespace App\Http\Requests\Availability;

use App\Enums\AvailabilityExceptionType;
use App\Models\Membership;
use App\Rules\BelongsToCurrentOrganization;
use App\Rules\NoOverlappingAvailabilityException;
use App\Support\CurrentOrganization;
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
        $membershipId = $this->filled('membership_id') ? $this->integer('membership_id') : null;
        $startAt = $this->filled('start_at') ? $this->string('start_at')->toString() : null;

        return [
            'membership_id' => ['nullable', new BelongsToCurrentOrganization(Membership::class)],
            'type' => ['required', Rule::enum(AvailabilityExceptionType::class)],
            'start_at' => ['required', 'date'],
            'end_at' => [
                'required',
                'date',
                'after:start_at',
                new NoOverlappingAvailabilityException(
                    membershipId: $membershipId,
                    startAt: $startAt,
                    ignoreId: null,
                    organizationId: (int) app(CurrentOrganization::class)->get(),
                ),
            ],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
