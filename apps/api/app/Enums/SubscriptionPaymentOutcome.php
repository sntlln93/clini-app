<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Provider-agnostic outcome of one recurring charge, as normalized by the
 * SubscriptionGateway adapter.
 */
enum SubscriptionPaymentOutcome: string
{
    case Approved = 'approved';
    case Failed = 'failed';
}
