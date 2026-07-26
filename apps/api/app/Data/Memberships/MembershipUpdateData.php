<?php

declare(strict_types=1);

namespace App\Data\Memberships;

use App\Contracts\Data;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;

final readonly class MembershipUpdateData implements Data
{
    /**
     * @param  array<int, MembershipRole>  $roles
     */
    public function __construct(
        public int $membershipId,
        public array $roles,
        public MembershipStatus $status,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'membershipId' => $this->membershipId,
            'roles' => array_map(fn (MembershipRole $role): string => $role->value, $this->roles),
            'status' => $this->status->value,
        ];
    }
}
