<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Enums\SubscriptionStatus;
use App\Models\Organization;
use App\Models\Subscription;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Organization list item. Expects `active_members_count` (withCount) and
 * the `subscription` relation to be loaded.
 *
 * @mixin Organization
 */
class AdminOrganizationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $organization = $this->organization();

        /** @var Subscription|null $subscription */
        $subscription = $organization->subscription;

        return array_merge($this->baseFields(), [
            'subscription' => $subscription === null ? null : [
                'status' => $this->statusOf($subscription)->value,
                'grace_ends_at' => $subscription->grace_ends_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * The fields shared with the detail resource.
     *
     * @return array<string, mixed>
     */
    protected function baseFields(): array
    {
        $organization = $this->organization();

        /** @var CarbonImmutable|null $suspendedAt */
        $suspendedAt = $organization->suspended_at;

        return [
            'id' => $organization->id,
            'name' => $organization->name,
            'slug' => $organization->slug,
            'timezone' => $organization->timezone,
            'created_at' => $organization->created_at?->toIso8601String(),
            'suspended_at' => $suspendedAt?->toIso8601String(),
            'suspension_reason' => $organization->suspension_reason,
            'active_members_count' => $this->countAttribute('active_members_count'),
        ];
    }

    /** A withCount aggregate; PDO returns it as int or numeric string. */
    protected function countAttribute(string $key): int
    {
        $value = $this->organization()->getAttribute($key);

        return is_numeric($value) ? (int) $value : 0;
    }

    protected function organization(): Organization
    {
        /** @var Organization $organization */
        $organization = $this->resource;

        return $organization;
    }

    private function statusOf(Subscription $subscription): SubscriptionStatus
    {
        /** @var SubscriptionStatus $status */
        $status = $subscription->status;

        return $status;
    }
}
