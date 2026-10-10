<?php

declare(strict_types=1);

namespace App\Data\Subscriptions;

use App\Contracts\Data;

/**
 * An organization whose Practice amount may have changed with its count of
 * active professionals.
 */
final readonly class SubscriptionAmountSyncData implements Data
{
    public function __construct(
        public int $organizationId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['organization_id' => $this->organizationId];
    }
}
