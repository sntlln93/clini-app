<?php

declare(strict_types=1);

namespace App\Enums;

use App\Models\Subscription;

/**
 * The organization's plan (#237, ADR 0014). Only Center is stored
 * (`organizations.assigned_plan`, set by a platform operator); Practice
 * comes from a subscription that grants it, and everything else is Free.
 */
enum Plan: string
{
    case Free = 'free';
    case Practice = 'practice';
    case Center = 'center';

    public static function resolve(?self $assigned, ?Subscription $subscription): self
    {
        if ($assigned !== null) {
            return $assigned;
        }

        return $subscription?->grantsPaidPlan() === true ? self::Practice : self::Free;
    }

    public function includes(PlanFeature $feature): bool
    {
        return match ($feature) {
            PlanFeature::Reports => $this === self::Center,
            default => $this !== self::Free,
        };
    }

    /**
     * Active professional memberships the plan allows; null for no limit.
     * Practice has none: it bills each professional past the included ones.
     */
    public function professionalLimit(): ?int
    {
        return $this === self::Free ? 1 : null;
    }

    /**
     * Appointments per calendar month the plan allows (#238); null for no limit.
     */
    public function monthlyAppointmentLimit(): ?int
    {
        return $this === self::Free ? 40 : null;
    }

    /**
     * The month's appointment count that triggers the owner's warning.
     */
    public function appointmentWarningThreshold(): ?int
    {
        return $this === self::Free ? 35 : null;
    }
}
