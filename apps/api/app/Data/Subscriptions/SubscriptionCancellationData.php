<?php

declare(strict_types=1);

namespace App\Data\Subscriptions;

use App\Contracts\Data;

/**
 * An owner's request to cancel the organization's subscription.
 */
final readonly class SubscriptionCancellationData implements Data
{
    public function __construct(
        public int $organizationId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organization_id' => $this->organizationId,
        ];
    }
}
