<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;

final readonly class OrganizationReactivationData implements Data
{
    public function __construct(
        public AdminActorData $actor,
        public int $organizationId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'actor' => $this->actor,
            'organizationId' => $this->organizationId,
        ];
    }
}
