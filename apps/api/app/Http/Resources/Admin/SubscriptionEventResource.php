<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Models\SubscriptionEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A verified provider webhook notification. Expects
 * `subscription.organization` to be loaded (both may be null).
 *
 * @mixin SubscriptionEvent
 */
class SubscriptionEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var SubscriptionEvent $event */
        $event = $this->resource;

        $organization = $event->subscription?->organization;

        /** @var array<string, mixed> $payload */
        $payload = $event->payload ?? [];

        return [
            'id' => $event->id,
            'provider' => $event->provider,
            'notification_id' => $event->notification_id,
            'type' => $event->type,
            'resource_id' => $event->resource_id,
            'subscription_id' => $event->subscription_id,
            'organization' => $organization === null ? null : [
                'id' => $organization->id,
                'name' => $organization->name,
            ],
            'payload' => (object) $payload,
            'created_at' => $event->created_at?->toIso8601String(),
        ];
    }
}
