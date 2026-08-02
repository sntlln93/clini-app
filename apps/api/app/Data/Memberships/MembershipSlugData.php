<?php

declare(strict_types=1);

namespace App\Data\Memberships;

use App\Contracts\Data;

final readonly class MembershipSlugData implements Data
{
    public function __construct(
        public int $membershipId,
        public ?string $slug,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'membershipId' => $this->membershipId,
            'slug' => $this->slug,
        ];
    }
}
