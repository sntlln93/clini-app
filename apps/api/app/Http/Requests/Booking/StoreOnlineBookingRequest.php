<?php

declare(strict_types=1);

namespace App\Http\Requests\Booking;

use App\Actions\Booking\ListAvailableSlotsAction;
use App\Data\Patients\PatientContactData;
use App\Enums\DocumentType;
use App\Models\AcceptedInsuranceProvider;
use App\Models\Organization;
use App\Rules\Iso8601Instant;
use App\Support\CurrentOrganization;
use App\Support\PatientContactInput;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOnlineBookingRequest extends FormRequest
{
    private const int MAX_CONTACTS = 4;

    // A member number only means something next to its provider, so it's dropped when there is none.
    protected function prepareForValidation(): void
    {
        if (blank($this->input('patient.insurance_provider_id'))) {
            $this->merge(['patient' => [...(array) $this->input('patient', []), 'insurance_member_number' => null]]);
        }
    }

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
            'start_at' => ['required', new Iso8601Instant, 'after:now', 'before_or_equal:'.$bookingWindowEnd->toIso8601String()],
            'patient.name' => ['required', 'string', 'max:255'],
            'patient.document_type' => ['required', Rule::enum(DocumentType::class)],
            'patient.document_number' => ['required', 'string', 'max:50'],
            // Fewer than the practice's form takes: an anonymous booking only adds to the patient's contacts (#365).
            ...PatientContactInput::rules('patient.contacts', self::MAX_CONTACTS),
            // Only a provider the practice accepts (#291). Never checked against other patients' member numbers: that would let anyone probe them.
            'patient.insurance_provider_id' => ['nullable', 'integer', Rule::in($this->acceptedInsuranceProviderIds())],
            'patient.insurance_member_number' => [
                'nullable',
                'required_with:patient.insurance_provider_id',
                'string',
                'max:50',
                'regex:/[\pL\pN]/u',
            ],
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
            ...PatientContactInput::messages('patient.contacts'),
            'patient.insurance_provider_id.in' => 'El consultorio no atiende esa obra social.',
            'patient.insurance_member_number.required_with' => 'El número de afiliado es obligatorio.',
            'patient.insurance_member_number.regex' => 'El número de afiliado debe tener al menos una letra o un número.',
        ];
    }

    /**
     * @return list<callable>
     */
    public function after(): array
    {
        return PatientContactInput::after($this, 'patient.contacts');
    }

    /**
     * @return list<PatientContactData>
     */
    public function contacts(): array
    {
        return PatientContactInput::data($this, 'patient.contacts');
    }

    /**
     * @return list<int>
     */
    private function acceptedInsuranceProviderIds(): array
    {
        $organizationId = app(CurrentOrganization::class)->get();

        if ($organizationId === null) {
            return [];
        }

        /** @var list<int> $ids */
        $ids = AcceptedInsuranceProvider::query()->where('organization_id', $organizationId)->pluck('insurance_provider_id')->all();

        return $ids;
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
