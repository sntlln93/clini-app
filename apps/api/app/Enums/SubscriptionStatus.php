<?php

declare(strict_types=1);

namespace App\Enums;

enum SubscriptionStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Grace = 'grace';
    case Expired = 'expired';
    case Cancelled = 'cancelled';

    /**
     * Expired/cancelled organizations keep read access only: writes on
     * appointments, clinical notes, prescriptions, availability and public
     * booking are rejected (see EnsureSubscriptionActive).
     */
    public function restrictsWrites(): bool
    {
        return $this === self::Expired || $this === self::Cancelled;
    }
}
