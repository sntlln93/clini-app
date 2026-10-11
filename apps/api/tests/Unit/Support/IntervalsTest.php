<?php

declare(strict_types=1);

use App\Support\Intervals;
use Carbon\CarbonImmutable;

function intervalAt(string $start, string $end): array
{
    return ['start' => CarbonImmutable::parse('2026-08-03 '.$start), 'end' => CarbonImmutable::parse('2026-08-03 '.$end)];
}

/**
 * @param  array<int, array{start: CarbonImmutable, end: CarbonImmutable}>  $intervals
 * @return array<int, string>
 */
function intervalLabels(array $intervals): array
{
    return array_map(fn (array $i): string => $i['start']->format('H:i').'-'.$i['end']->format('H:i'), $intervals);
}

test('merge sorts and joins overlapping and adjacent intervals', function () {
    $merged = Intervals::merge([intervalAt('14:00', '15:00'), intervalAt('09:00', '11:00'), intervalAt('10:00', '12:00'), intervalAt('12:00', '13:00')]);

    expect(intervalLabels($merged))->toBe(['09:00-13:00', '14:00-15:00']);
});

test('subtract splits an interval around a removed range and drops empty pieces', function () {
    $remaining = Intervals::subtract([intervalAt('09:00', '12:00'), intervalAt('14:00', '15:00')], [intervalAt('10:00', '11:00'), intervalAt('14:00', '15:00')]);

    expect(intervalLabels($remaining))->toBe(['09:00-10:00', '11:00-12:00']);
});

test('clip keeps only the part inside the window, or null when there is none', function () {
    $from = CarbonImmutable::parse('2026-08-03 09:00');
    $to = CarbonImmutable::parse('2026-08-03 12:00');

    expect(intervalLabels([Intervals::clip(CarbonImmutable::parse('2026-08-03 08:00'), CarbonImmutable::parse('2026-08-03 10:00'), $from, $to)]))->toBe(['09:00-10:00'])
        ->and(Intervals::clip(CarbonImmutable::parse('2026-08-03 12:00'), CarbonImmutable::parse('2026-08-03 13:00'), $from, $to))->toBeNull();
});

test('minutes sums the length of every interval', function () {
    expect(Intervals::minutes([intervalAt('09:00', '10:30'), intervalAt('14:00', '14:45')]))->toBe(135)
        ->and(Intervals::minutes([]))->toBe(0);
});
