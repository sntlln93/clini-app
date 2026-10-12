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
 * the practice, with the professional and service in the description and
 * the practice's primary address as the location, when it has one.
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
            uid: "appointment-{$appointment->id}@".$this->host(),
            title: $this->title($organization?->name),
            description: $this->description(
                $appointment->membership?->user?->name,
                $appointment->service?->name,
                $organization?->name,
            ),
            location: $organization === null ? null : $this->locationOf($organization),
            startAt: CarbonImmutable::instance($startAt)->utc(),
            endAt: CarbonImmutable::instance($endAt)->utc(),
        );
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

        return $parts === [] ? null : implode(', ', $parts);
    }

    private function title(?string $organizationName): string
    {
        return $organizationName === null ? 'Turno' : "Turno en {$organizationName}";
    }

    private function description(?string $professionalName, ?string $serviceName, ?string $organizationName): string
    {
        $lines = array_filter([
            $professionalName === null ? null : "Profesional: {$professionalName}",
            $serviceName === null ? null : "Prestación: {$serviceName}",
            'Si necesitás cancelar o reprogramar el turno, comunicate con '.($organizationName ?? 'el consultorio').'.',
        ]);

        return implode("\n", $lines);
    }

    private function host(): string
    {
        /** @var string $appUrl */
        $appUrl = config('app.url');

        return parse_url($appUrl, PHP_URL_HOST) ?: 'clini';
    }
}
