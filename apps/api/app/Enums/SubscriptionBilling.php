<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * How often a subscription charges (#240). Fixed for the life of its
 * provider subscription: Mercado Pago can't change a preapproval's
 * frequency, only its amount, so a different one needs a new checkout.
 */
enum SubscriptionBilling: string
{
    case Monthly = 'monthly';
    case Annual = 'annual';

    /** Months between two charges. */
    public function months(): int
    {
        return match ($this) {
            self::Monthly => 1,
            self::Annual => 12,
        };
    }
}
