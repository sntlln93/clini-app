<?php

declare(strict_types=1);

namespace App\Data\Memberships;

use App\Contracts\Data;
use App\Enums\MembershipRole;
use App\Http\Requests\Memberships\StoreMembershipInvitationRequest;

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

    public static function fromRequest(StoreMembershipInvitationRequest $request, int $organizationId): self
    {
        /** @var array<int, string> $rawRoles */
        $rawRoles = $request->validated('roles');

        return new self(
            organizationId: $organizationId,
            email: $request->string('email')->toString(),
            roles: array_map(static fn (string $role): MembershipRole => MembershipRole::from($role), $rawRoles),
        );
    }

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
