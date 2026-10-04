<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * What a provider webhook notification refers to, as classified by the
 * SubscriptionGateway adapter from its raw `type`.
 */
enum SubscriptionNotificationKind: string
{
    case Subscription = 'subscription';
    case Payment = 'payment';
}
