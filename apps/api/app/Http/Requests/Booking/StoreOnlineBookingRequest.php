<?php

declare(strict_types=1);

namespace App\Http\Requests\Booking;

use App\Actions\Booking\ListAvailableSlotsAction;
use App\Enums\DocumentType;
use App\Models\Organization;
use App\Support\CurrentOrganization;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOnlineBookingRequest extends FormRequest
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
        // Same window the slot search offers: through the end of the
        // practice's own day BOOKING_WINDOW_DAYS out, not now() + N days in UTC.
        $bookingWindowEnd = CarbonImmutable::today($this->organizationTimezone())
            ->addDays(ListAvailableSlotsAction::BOOKING_WINDOW_DAYS)
            ->endOfDay();

        return [
            'membership_id' => ['required', 'integer', 'exists:memberships,id'],
            'service_id' => ['required', 'integer', 'exists:services,id'],
            'start_at' => ['required', 'date', 'after:now', 'before_or_equal:'.$bookingWindowEnd->toIso8601String()],
            'patient.name' => ['required', 'string', 'max:255'],
            'patient.document_type' => ['required', Rule::enum(DocumentType::class)],
            'patient.document_number' => ['required', 'string', 'max:50'],
            'patient.email' => ['nullable', 'email', 'max:255'],
            'patient.phone' => ['nullable', 'string', 'max:50'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'membership_id.exists' => 'El profesional elegido no existe.',
            'service_id.exists' => 'La prestación elegida no existe.',
            'start_at.after' => 'No se pueden reservar turnos en el pasado.',
            'start_at.before_or_equal' => 'No se pueden reservar turnos con más de '.ListAvailableSlotsAction::BOOKING_WINDOW_DAYS.' días de anticipación.',
            'patient.name.required' => 'El nombre es obligatorio.',
            'patient.document_type.required' => 'Elegí un tipo de documento.',
            'patient.document_number.required' => 'El número de documento es obligatorio.',
            'patient.email.email' => 'El correo no es válido.',
        ];
    }

    // `public-organization` has already resolved the tenant from {slug}; the
    // app timezone is only a fallback for a request that never went through it.
    private function organizationTimezone(): string
    {
        $organizationId = app(CurrentOrganization::class)->get();
        $timezone = $organizationId === null ? null : Organization::query()->whereKey($organizationId)->value('timezone');

        return is_string($timezone) ? $timezone : config()->string('app.timezone');
    }
}
