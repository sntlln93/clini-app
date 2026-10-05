<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Http\Resources\Subscriptions\SubscriptionResource;
use App\Models\Organization;
use App\Models\Subscription;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;

/**
 * The panel's SubscriptionResource (status, restricted, grace_days_left…)
 * plus the operator-only fields. Expects the `organization` relation to be
 * loaded with a live organization.
 *
 * @mixin Subscription
 */
class AdminSubscriptionResource extends SubscriptionResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Subscription $subscription */
        $subscription = $this->resource;

        /** @var Organization $organization */
        $organization = $subscription->organization;

        /** @var CarbonImmutable|null $suspendedAt */
        $suspendedAt = $organization->suspended_at;

        $graceReason = $subscription->grace_reason;

        return array_merge(parent::toArray($request), [
            'id' => $subscription->id,
            'organization' => [
                'id' => $organization->id,
                'name' => $organization->name,
                'slug' => $organization->slug,
                'suspended_at' => $suspendedAt?->toIso8601String(),
            ],
            'provider' => $subscription->provider,
            'provider_subscription_id' => $subscription->provider_subscription_id,
            'grace_reason' => $graceReason?->value,
            'created_at' => $subscription->created_at?->toIso8601String(),
            'updated_at' => $subscription->updated_at?->toIso8601String(),
        ]);
    }
}
