<?php

declare(strict_types=1);

namespace App\Enums;

enum AppointmentStatus: string
{
    case Scheduled = 'scheduled';
    case Confirmed = 'confirmed';
    case Arrived = 'arrived';
    case Completed = 'completed';
    case NoShow = 'no_show';
    case Cancelled = 'cancelled';
    case Rescheduled = 'rescheduled';

    /**
     * The statuses this status may transition to. Anything not listed here
     * (including Cancelled/Rescheduled, which are terminal for this map)
     * has no allowed transitions.
     *
     * @return array<int, self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::Scheduled => [self::Confirmed, self::NoShow],
            self::Confirmed => [self::Arrived, self::NoShow],
            self::Arrived => [self::Completed],
            default => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }
}
