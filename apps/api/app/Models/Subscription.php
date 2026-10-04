<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SubscriptionGraceReason;
use App\Enums\SubscriptionStatus;
use App\Support\Concerns\BelongsToOrganization;
use Database\Factories\SubscriptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
}
