<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Appointments\CalendarEventData;
use Carbon\CarbonInterface;

/** The panel builds the same event in `calendar-event.ts`: keep the two in sync. */
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

    /** METHOD:PUBLISH, not REQUEST: a static copy, not an invite to accept or decline. */
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

    /** RFC 5545 §3.3.11; other control characters are dropped so a name can't start a property line of its own. */
    private static function text(string $value): string
    {
        $value = (string) preg_replace('/\r\n|\r/', "\n", $value);
        $value = (string) preg_replace('/[\x00-\x08\x0B-\x1F\x7F]/', '', $value);

        return str_replace(['\\', ';', ',', "\n"], ['\\\\', '\\;', '\\,', '\\n'], $value);
    }

    /** RFC 5545 §3.1: fold at 75 octets, never splitting a UTF-8 character. */
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
