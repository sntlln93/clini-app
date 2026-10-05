<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SubscriptionGraceReason;
use App\Enums\SubscriptionStatus;
use App\Support\Concerns\BelongsToOrganization;
use Database\Factories\SubscriptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['organization_id', 'provider', 'provider_subscription_id', 'status', 'grace_ends_at', 'grace_reason', 'last_payment_at', 'last_payment_failed_at', 'next_payment_at', 'cancelled_at'])]
class Subscription extends Model
{
    /** @use HasFactory<SubscriptionFactory> */
    use BelongsToOrganization, HasFactory;

    public const PROVIDER_MERCADOPAGO = 'mercadopago';

    /** Days a failed charge keeps full access before the subscription expires. */
    public const GRACE_DAYS = 7;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => SubscriptionStatus::class,
            'grace_ends_at' => 'immutable_datetime',
            'grace_reason' => SubscriptionGraceReason::class,
            'last_payment_at' => 'immutable_datetime',
            'last_payment_failed_at' => 'immutable_datetime',
            'next_payment_at' => 'immutable_datetime',
            'cancelled_at' => 'immutable_datetime',
        ];
    }

    /**
     * @return HasMany<SubscriptionEvent, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(SubscriptionEvent::class);
    }

    /**
     * Excludes subscriptions of soft-deleted organizations, whose
     * `organization` relation would resolve to null. Every platform-operator
     * read of subscriptions applies it.
     *
     * @param  Builder<Subscription>  $query
     * @return Builder<Subscription>
     */
    public function scopeOfLiveOrganization(Builder $query): Builder
    {
        return $query->whereHas('organization');
    }

    /**
     * @param  Builder<Subscription>  $query
     * @return Builder<Subscription>
     */
    public function scopeWithStatus(Builder $query, ?SubscriptionStatus $status): Builder
    {
        return $status === null ? $query : $query->where('status', $status);
    }

    /**
     * Grace subscriptions ending within `$days` from now, including those
     * already past their end but not yet expired by the daily command.
     *
     * @param  Builder<Subscription>  $query
     * @return Builder<Subscription>
     */
    public function scopeGraceEndingWithin(Builder $query, ?int $days): Builder
    {
        if ($days === null) {
            return $query;
        }

        return $query->where('status', SubscriptionStatus::Grace)
            ->where('grace_ends_at', '<=', now()->addDays($days));
    }

    /**
     * Case-insensitive contains match on the organization's name or slug.
     *
     * @param  Builder<Subscription>  $query
     * @return Builder<Subscription>
     */
    public function scopeOrganizationSearch(Builder $query, ?string $term): Builder
    {
        if ($term === null || $term === '') {
            return $query;
        }

        return $query->whereHas('organization', fn (Builder $query) => $query->where(function (Builder $query) use ($term) {
            $query->where('name', 'ilike', "%{$term}%")
                ->orWhere('slug', 'ilike', "%{$term}%");
        }));
    }
}
