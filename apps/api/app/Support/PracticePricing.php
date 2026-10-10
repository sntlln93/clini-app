<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Practice's monthly price (`config/plans.php`): the base amount covers the
 * included professionals and each active one past them adds the extra
 * amount. Changes apply from the next charge, never prorated (ADR 0014).
 */
final class PracticePricing
{
    public function monthlyAmount(int $activeProfessionals): int
    {
        $extra = max(0, $activeProfessionals - $this->includedProfessionals());

        return $this->baseAmount() + $extra * $this->extraProfessionalAmount();
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

    public function currency(): string
    {
        return config()->string('plans.practice.currency', 'ARS');
    }
}
