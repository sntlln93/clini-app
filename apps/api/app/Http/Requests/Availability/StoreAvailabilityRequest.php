<?php

declare(strict_types=1);

namespace App\Http\Requests\Availability;

use App\Models\Membership;
use App\Rules\BelongsToCurrentOrganization;
use App\Rules\NoOverlappingAvailability;
use Illuminate\Foundation\Http\FormRequest;

class StoreAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $membership = $this->route('membership');

        $this->merge([
            'membership_id' => $membership instanceof Membership ? $membership->id : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'membership_id' => ['required', new BelongsToCurrentOrganization(Membership::class)],
            'day_of_week' => ['required', 'integer', 'between:0,6'],
            'start_time' => ['required', 'date_format:H:i,H:i:s'],
            'end_time' => [
                'required',
                'date_format:H:i,H:i:s',
                'after:start_time',
                new NoOverlappingAvailability(
                    membershipId: $this->integer('membership_id'),
                    dayOfWeek: $this->integer('day_of_week'),
                    startTime: $this->filled('start_time') ? $this->string('start_time')->toString() : null,
                    ignoreId: null,
                ),
            ],
        ];
    }
}
