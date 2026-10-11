<?php

declare(strict_types=1);

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Half-open time ranges, `[start, end)`, as plain arrays.
 *
 * @phpstan-type Interval array{start: CarbonImmutable, end: CarbonImmutable}
 */
final class Intervals
{
    /**
     * @param  array<int, Interval>  $intervals
     * @return array<int, Interval> sorted and disjoint
     */
    public static function merge(array $intervals): array
    {
        usort($intervals, fn (array $a, array $b): int => $a['start'] <=> $b['start']);
        $merged = [];

        foreach ($intervals as $interval) {
            $last = array_key_last($merged);

            if ($last !== null && $interval['start']->lte($merged[$last]['end'])) {
                $merged[$last]['end'] = $merged[$last]['end']->max($interval['end']);

                continue;
            }

            $merged[] = $interval;
        }

        return $merged;
    }

    /**
     * @param  array<int, Interval>  $intervals
     * @param  array<int, Interval>  $removed
     * @return array<int, Interval>
     */
    public static function subtract(array $intervals, array $removed): array
    {
        foreach ($removed as $block) {
            $remaining = [];

            foreach ($intervals as $interval) {
                if ($block['end']->lte($interval['start']) || $block['start']->gte($interval['end'])) {
                    $remaining[] = $interval;

                    continue;
                }

                if ($block['start']->gt($interval['start'])) {
                    $remaining[] = ['start' => $interval['start'], 'end' => $block['start']];
                }

                if ($block['end']->lt($interval['end'])) {
                    $remaining[] = ['start' => $block['end'], 'end' => $interval['end']];
                }
            }

            $intervals = $remaining;
        }

        return array_values(array_filter(
            $intervals,
            fn (array $interval): bool => $interval['start']->lt($interval['end']),
        ));
    }

    /**
     * @return Interval|null
     */
    public static function clip(CarbonImmutable $start, CarbonImmutable $end, CarbonImmutable $from, CarbonImmutable $to): ?array
    {
        $start = $start->max($from);
        $end = $end->min($to);

        return $start->lt($end) ? ['start' => $start, 'end' => $end] : null;
    }

    /**
     * @param  array<int, Interval>  $intervals
     */
    public static function minutes(array $intervals): int
    {
        return array_sum(array_map(
            fn (array $interval): int => (int) $interval['start']->diffInMinutes($interval['end']),
            $intervals,
        ));
    }
}
