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
     * Appointments per calendar month the plan allows (#238); null for no
     * limit. Free's comes from config, where 0 (the default) lifts it (#300).
     */
    public function monthlyAppointmentLimit(): ?int
    {
        if ($this !== self::Free) {
            return null;
        }

        $limit = config()->integer('plans.free.monthly_appointment_limit');

        return $limit > 0 ? $limit : null;
    }

    /**
     * The month's appointment count that triggers the owner's warning; null
     * when there is no limit, or the configured threshold is 0 or doesn't
     * come before the limit.
     */
    public function appointmentWarningThreshold(): ?int
    {
        $limit = $this->monthlyAppointmentLimit();

        if ($limit === null) {
            return null;
        }

        $threshold = config()->integer('plans.free.appointment_warning_threshold');

        return $threshold > 0 && $threshold < $limit ? $threshold : null;
    }
}
