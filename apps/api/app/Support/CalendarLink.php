<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Appointments\CalendarEventData;
use Carbon\CarbonInterface;

/**
 * Pure formatting of a calendar event as a Google Calendar template link and
 * as an iCalendar (RFC 5545) file, with no login or API integration (#295).
 * Instants always go out in UTC (ADR 0016). The panel's booking confirmation
 * builds the same event in `calendar-event.ts`: keep the two in sync.
 */
final class CalendarLink
{
    private const string GOOGLE_TEMPLATE_URL = 'https://calendar.google.com/calendar/render';

    public static function google(CalendarEventData $event): string
    {
        $query = array_filter([
            'action' => 'TEMPLATE',
            'text' => $event->title,
            'dates' => self::utc($event->startAt).'/'.self::utc($event->endAt),
            'details' => $event->description,
            'location' => $event->location,
        ], fn (?string $value): bool => $value !== null && $value !== '');

        return self::GOOGLE_TEMPLATE_URL.'?'.http_build_query($query, '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * METHOD:PUBLISH, not REQUEST: the event is a static copy, not an invite
     * the patient could accept or decline.
     */
    public static function ics(CalendarEventData $event, CarbonInterface $stampedAt): string
    {
        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Clini//Turnos//ES',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            'UID:'.self::text($event->uid),
            'DTSTAMP:'.self::utc($stampedAt),
            'DTSTART:'.self::utc($event->startAt),
            'DTEND:'.self::utc($event->endAt),
            'SUMMARY:'.self::text($event->title),
            'DESCRIPTION:'.self::text($event->description),
        ];

        if ($event->location !== null && $event->location !== '') {
            $lines[] = 'LOCATION:'.self::text($event->location);
        }

        $lines[] = 'END:VEVENT';
        $lines[] = 'END:VCALENDAR';

        return implode("\r\n", array_map(self::fold(...), $lines))."\r\n";
    }

    private static function utc(CarbonInterface $instant): string
    {
        return $instant->toImmutable()->utc()->format('Ymd\THis\Z');
    }

    /** RFC 5545 §3.3.11: backslash, semicolon and comma are escaped, newlines become `\n`. */
    private static function text(string $value): string
    {
        return str_replace(
            ['\\', ';', ',', "\r\n", "\n"],
            ['\\\\', '\\;', '\\,', '\\n', '\\n'],
            $value,
        );
    }

    /** RFC 5545 §3.1: lines longer than 75 octets continue on the next one, indented by a space, never splitting a UTF-8 character. */
    private static function fold(string $line): string
    {
        $folded = [];
        $limit = 75;

        while (strlen($line) > $limit) {
            $chunk = mb_strcut($line, 0, $limit, 'UTF-8');
            $folded[] = $chunk;
            $line = substr($line, strlen($chunk));
            $limit = 74;
        }

        $folded[] = $line;

        return implode("\r\n ", $folded);
    }
}
