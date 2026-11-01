<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\SubscriptionBilling;

/**
 * Annual rounds the discounted month to whole pesos first, matching the landing's «$9.000 por mes, en un pago de $108.000».
 */
final class PracticePricing
{
    public function monthlyAmount(int $activeProfessionals): int
    {
        $extra = max(0, $activeProfessionals - $this->includedProfessionals());

        return $this->baseAmount() + $extra * $this->extraProfessionalAmount();
    }

    public function amount(int $activeProfessionals, SubscriptionBilling $billing): int
    {
        $monthly = $this->monthlyAmount($activeProfessionals);

        return match ($billing) {
            SubscriptionBilling::Monthly => $monthly,
            SubscriptionBilling::Annual => (int) round($monthly * (100 - $this->annualDiscountPercent()) / 100) * 12,
        };
    }

    public function monthlyEquivalent(int $amount, SubscriptionBilling $billing): int
    {
        return intdiv($amount, $billing->months());
    }

    public function baseAmount(): int
    {
        return config()->integer('plans.practice.base_amount');
    }

    public function includedProfessionals(): int
    {
        return config()->integer('plans.practice.included_professionals');
    }

    public function extraProfessionalAmount(): int
    {
        return config()->integer('plans.practice.extra_professional_amount');
    }

    /**
     * Clamped so a mistyped value can't make the year cost more than twelve months, or less than nothing.
     */
    public function annualDiscountPercent(): int
    {
        return max(0, min(100, config()->integer('plans.practice.annual_discount_percent')));
    }

    public function currency(): string
    {
        return config()->string('plans.practice.currency', 'ARS');
    }
}
