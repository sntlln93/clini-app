<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Appointments\CalendarEventData;
use App\Models\Appointment;
use App\Models\Organization;
use Carbon\CarbonImmutable;
use Illuminate\Support\Carbon;

/** The patient's view of an appointment as a calendar event: never the professional nor the service (ADR 0018). */
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

    /** Shared by the reminder's and the confirmation's `.ics` (one event); opaque, since the confirmation is public and a raw id would leak the practice's volume. */
    public function uidOf(Appointment $appointment): string
    {
        /** @var string $key */
        $key = config('app.key');

        return substr(hash_hmac('sha256', "appointment-{$appointment->id}", $key), 0, 32).'@'.$this->host();
    }

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
