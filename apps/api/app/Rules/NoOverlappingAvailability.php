<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\Availability;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Rejects an availability slot's end_time when it overlaps another slot of
 * the same membership+day_of_week (half-open interval comparison:
 * start_time < :end AND end_time > :start). $ignoreId excludes the row
 * being updated from its own collision check.
 */
final readonly class NoOverlappingAvailability implements ValidationRule
{
    public function __construct(
        private int $membershipId,
        private int $dayOfWeek,
        private ?string $startTime,
        private ?int $ignoreId,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($this->startTime === null) {
            return;
        }

        $query = Availability::query()
            ->where('membership_id', $this->membershipId)
            ->where('day_of_week', $this->dayOfWeek)
            ->where('start_time', '<', $value)
            ->where('end_time', '>', $this->startTime);

        if ($this->ignoreId !== null) {
            $query->whereKeyNot($this->ignoreId);
        }

        if ($query->exists()) {
            $fail('El horario se superpone con otra franja existente.');
        }
    }
}
