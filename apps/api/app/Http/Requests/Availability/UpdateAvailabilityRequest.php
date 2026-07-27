<?php

declare(strict_types=1);

namespace App\Http\Requests\Availability;

use App\Models\Availability;
use App\Rules\NoOverlappingAvailability;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAvailabilityRequest extends FormRequest
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
        $availability = $this->route('availability');

        return [
            'day_of_week' => ['required', 'integer', 'between:0,6'],
            'start_time' => ['required', 'date_format:H:i,H:i:s'],
            'end_time' => [
                'required',
                'date_format:H:i,H:i:s',
                'after:start_time',
                new NoOverlappingAvailability(
                    membershipId: $availability instanceof Availability ? $availability->membership_id : 0,
                    dayOfWeek: $this->integer('day_of_week'),
                    startTime: $this->filled('start_time') ? $this->string('start_time')->toString() : null,
                    ignoreId: $availability instanceof Availability ? $availability->id : null,
                ),
            ],
        ];
    }
}
