<?php

declare(strict_types=1);

namespace App\Exceptions\Memberships;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when a membership slug is already used, in the flat namespace
 * shared with organizations.slug and every other membership's slug —
 * SetMembershipSlugAction.
 */
final class MembershipSlugTakenException extends DomainException
{
    public function __construct(
        private readonly int $membershipId,
        private readonly string $slug,
    ) {
        parent::__construct('The slug is already taken.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MembershipsSlugTaken;
    }

    public function httpStatus(): int
    {
        return 409;
    }

    /**
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [
            'membership_id' => $this->membershipId,
            'slug' => $this->slug,
        ];
    }
}
