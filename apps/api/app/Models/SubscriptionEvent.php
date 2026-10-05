<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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

    /**
     * @return BelongsTo<Subscription, $this>
     */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /**
     * Events of the given organization's subscription.
     *
     * @param  Builder<SubscriptionEvent>  $query
     * @return Builder<SubscriptionEvent>
     */
    public function scopeForOrganization(Builder $query, ?int $organizationId): Builder
    {
        if ($organizationId === null) {
            return $query;
        }

        return $query->whereHas(
            'subscription',
            fn (Builder $query) => $query->withoutGlobalScope('organization')->where('organization_id', $organizationId),
        );
    }
}
