<?php

declare(strict_types=1);

namespace App\Http\Requests\Availability;

use App\Models\Membership;
use App\Rules\BelongsToCurrentOrganization;
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
            'end_time' => ['required', 'date_format:H:i,H:i:s', 'after:start_time'],
            'merge' => ['sometimes', 'boolean'],
        ];
    }
}
