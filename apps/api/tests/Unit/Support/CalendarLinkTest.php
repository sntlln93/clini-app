<?php

declare(strict_types=1);

use App\Data\Appointments\CalendarEventData;
use App\Support\CalendarLink;
use Carbon\CarbonImmutable;

function calendarEvent(array $overrides = []): CalendarEventData
{
    return new CalendarEventData(...array_merge([
        'uid' => 'appointment-7@clini.test',
        'title' => 'Turno en Consultorio Salud',
        'description' => "Profesional: Ana Gómez\nPrestación: Consulta",
        'location' => 'Av. Corrientes 1234, Rosario, Santa Fe, Argentina',
        // -03:00 on purpose: both formats go out in UTC whatever the instant's zone.
        'startAt' => CarbonImmutable::parse('2026-08-03T10:00:00-03:00'),
        'endAt' => CarbonImmutable::parse('2026-08-03T10:45:00-03:00'),
    ], $overrides));
}

test('the Google Calendar link prefills title, UTC dates, details and location', function () {
    $url = CalendarLink::google(calendarEvent());

    expect($url)->toStartWith('https://calendar.google.com/calendar/render?');
    parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
    expect($query)->toBe([
        'action' => 'TEMPLATE',
        'text' => 'Turno en Consultorio Salud',
        'dates' => '20260803T130000Z/20260803T134500Z',
        'details' => "Profesional: Ana Gómez\nPrestación: Consulta",
        'location' => 'Av. Corrientes 1234, Rosario, Santa Fe, Argentina',
    ]);
});

test('the Google Calendar link leaves the location out when the practice has no address', function () {
    $url = CalendarLink::google(calendarEvent(['location' => null]));

    expect($url)->not->toContain('location=');
});

test('the .ics is a published VEVENT in UTC, CRLF-terminated', function () {
    $ics = CalendarLink::ics(calendarEvent(), CarbonImmutable::parse('2026-07-20T12:00:00Z'));

    expect($ics)->toBe(implode("\r\n", [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Clini//Turnos//ES',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        'UID:appointment-7@clini.test',
        'DTSTAMP:20260720T120000Z',
        'DTSTART:20260803T130000Z',
        'DTEND:20260803T134500Z',
        'SUMMARY:Turno en Consultorio Salud',
        'DESCRIPTION:Profesional: Ana Gómez\nPrestación: Consulta',
        'LOCATION:Av. Corrientes 1234\, Rosario\, Santa Fe\, Argentina',
        'END:VEVENT',
        'END:VCALENDAR',
    ])."\r\n");
});

test('the .ics escapes text values and has no LOCATION without an address', function () {
    $ics = CalendarLink::ics(
        calendarEvent(['title' => 'Turno; en Salud, \\ Centro', 'location' => null]),
        CarbonImmutable::parse('2026-07-20T12:00:00Z'),
    );

    expect($ics)->toContain("SUMMARY:Turno\; en Salud\\, \\\\ Centro\r\n")
        ->not->toContain('LOCATION');
});

test('the .ics folds lines over 75 octets without splitting a multibyte character', function () {
    $ics = CalendarLink::ics(
        calendarEvent(['description' => str_repeat('ñ', 100)]),
        CarbonImmutable::parse('2026-07-20T12:00:00Z'),
    );

    $lines = explode("\r\n", rtrim($ics, "\r\n"));
    foreach ($lines as $line) {
        expect(strlen($line))->toBeLessThanOrEqual(75)
            ->and(mb_check_encoding($line, 'UTF-8'))->toBeTrue();
    }

    $unfolded = str_replace("\r\n ", '', $ics);
    expect($unfolded)->toContain('DESCRIPTION:'.str_repeat('ñ', 100)."\r\n");
});

test('the .ics turns any line break into an escaped newline and drops other control characters', function () {
    $ics = CalendarLink::ics(
        calendarEvent(['title' => "Ana\rLOCATION:otra\x07 Gómez", 'description' => "uno\r\ndos\rtres\nfin\tok"]),
        CarbonImmutable::parse('2026-07-20T12:00:00Z'),
    );

    expect($ics)->toContain("SUMMARY:Ana\\nLOCATION:otra Gómez\r\n")
        ->toContain("DESCRIPTION:uno\\ndos\\ntres\\nfin\tok\r\n")
        ->and(substr_count($ics, "\r\nLOCATION:"))->toBe(1);
});
