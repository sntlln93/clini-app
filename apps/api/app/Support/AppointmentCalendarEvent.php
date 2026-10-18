<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Appointments\CalendarEventData;
use App\Models\Appointment;
use App\Models\Organization;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;

/**
 * The patient's view of an appointment as a calendar event (#295): titled by
 * the practice, with the practice's primary address as the location, when it
 * has one. Never the professional nor the service: they can reveal the
 * specialty, and the event ends up with a calendar provider (#320, ADR 0018).
 */
final class AppointmentCalendarEvent
{
    public function of(Appointment $appointment): CalendarEventData
    {
        /** @var Carbon $startAt */
        $startAt = $appointment->start_at;
        /** @var Carbon $endAt */
        $endAt = $appointment->end_at;
        $organization = $appointment->organization;

        return new CalendarEventData(
            uid: $this->uidOf($appointment),
            title: $this->title($organization?->name),
            description: $this->description($organization?->name),
            location: $organization === null ? null : $this->locationOf($organization),
            startAt: CarbonImmutable::instance($startAt)->utc(),
            endAt: CarbonImmutable::instance($endAt)->utc(),
        );
    }

    /**
     * The same for the reminder's `.ics` and the booking confirmation's, so a
     * patient who imports both keeps one event. Opaque: the confirmation is
     * public, and a raw id would tell how many appointments a practice has.
     */
    public function uidOf(Appointment $appointment): string
    {
        /** @var string $key */
        $key = config('app.key');

        return substr(hash_hmac('sha256', "appointment-{$appointment->id}", $key), 0, 32).'@'.$this->host();
    }

    /** One line, e.g. «Av. Corrientes 1234, Rosario, Santa Fe, Argentina»; null without an address. */
    public function locationOf(Organization $organization): ?string
    {
        $address = $organization->address;

        if ($address === null) {
            return null;
        }

        $parts = array_filter(
            [$address->street, $address->city?->name, $address->city?->province?->name, $address->country],
            fn (?string $part): bool => $part !== null && trim($part) !== '',
        );

        // A city named like its province (CABA) is named once.
        return $parts === [] ? null : implode(', ', array_unique($parts));
    }

    private function title(?string $organizationName): string
    {
        return $organizationName === null ? 'Turno' : "Turno en {$organizationName}";
    }

    private function description(?string $organizationName): string
    {
        return 'Si necesitás cancelar o reprogramar el turno, comunicate con '.($organizationName ?? 'el consultorio').'.';
    }

    private function host(): string
    {
        /** @var string $appUrl */
        $appUrl = config('app.url');

        return parse_url($appUrl, PHP_URL_HOST) ?: 'clini';
    }
}
