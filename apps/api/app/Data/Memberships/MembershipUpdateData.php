<?php

declare(strict_types=1);

namespace App\Data\Memberships;

use App\Contracts\Data;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Http\Requests\Memberships\UpdateMembershipRequest;
use App\Models\Membership;

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

    public static function fromRequest(UpdateMembershipRequest $request, Membership $membership): self
    {
        /** @var array<int, string> $rawRoles */
        $rawRoles = $request->validated('roles');

        /** @var string $rawStatus */
        $rawStatus = $request->validated('status');

        return new self(
            membershipId: $membership->id,
            roles: array_map(static fn (string $role): MembershipRole => MembershipRole::from($role), $rawRoles),
            status: MembershipStatus::from($rawStatus),
        );
    }

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
