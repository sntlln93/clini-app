<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\SubscriptionBilling;

/**
 * Practice's price (`config/plans.php`): the base amount covers the
 * included professionals and each active one past them adds the extra
 * amount, per month. Annual billing charges twelve months of that price
 * with the annual discount off, the discounted month rounded to whole
 * pesos first — the landing's «$9.000 por mes, en un pago de $108.000»
 * (#240). Changes apply from the next charge, never prorated (ADR 0014).
 */
final class PracticePricing
{
    public function monthlyAmount(int $activeProfessionals): int
    {
        $extra = max(0, $activeProfessionals - $this->includedProfessionals());

        return $this->baseAmount() + $extra * $this->extraProfessionalAmount();
    }

    /**
     * What each charge of `$billing` costs: a month, or the whole year.
     */
    public function amount(int $activeProfessionals, SubscriptionBilling $billing): int
    {
        $monthly = $this->monthlyAmount($activeProfessionals);

        return match ($billing) {
            SubscriptionBilling::Monthly => $monthly,
            SubscriptionBilling::Annual => (int) round($monthly * (100 - $this->annualDiscountPercent()) / 100) * 12,
        };
    }

    /**
     * A charge's amount spread per month, for the monthly recurring revenue.
     */
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
     * Clamped to 0–100, so a mistyped value can never make the year cost
     * more than twelve months, or less than nothing.
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
