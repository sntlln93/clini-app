<?php

declare(strict_types=1);

namespace App\Http\Requests\Appointments;

use App\Enums\AppointmentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexAppointmentRequest extends FormRequest
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
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after_or_equal:from'],
            'membership_id' => ['nullable', 'integer', 'exists:memberships,id'],
            'status' => ['nullable', Rule::enum(AppointmentStatus::class)],
        ];
    }
}
