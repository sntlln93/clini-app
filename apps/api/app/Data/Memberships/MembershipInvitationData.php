<?php

declare(strict_types=1);

namespace App\Data\Memberships;

use App\Contracts\Data;
use App\Enums\MembershipRole;

final readonly class MembershipInvitationData implements Data
{
    /**
     * @param  array<int, MembershipRole>  $roles
     */
    public function __construct(
        public int $organizationId,
        public string $email,
        public array $roles,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'email' => $this->email,
            'roles' => array_map(fn (MembershipRole $role): string => $role->value, $this->roles),
        ];
    }
}
