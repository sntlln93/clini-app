<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Idempotency log of verified provider webhook notifications, keyed by
 * (provider, notification_id).
 */
#[Fillable(['provider', 'notification_id', 'type', 'resource_id', 'subscription_id', 'payload'])]
class SubscriptionEvent extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }
}
