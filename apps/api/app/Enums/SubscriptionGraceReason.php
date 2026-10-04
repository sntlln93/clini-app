<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Why a subscription is in its grace period. A pause-opened grace is lifted
 * by resuming the preapproval (it doesn't charge again until the next
 * billing date); a failed charge's grace only by an approved charge.
 */
enum SubscriptionGraceReason: string
{
    case PaymentFailed = 'payment_failed';
    case Paused = 'paused';
}
