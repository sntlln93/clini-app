<?php

declare(strict_types=1);

namespace App\Exceptions\Memberships;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Thrown when a public slug is set on a membership that does not hold the
 * `professional` role — only professional memberships may have a public
 * booking link (SetMembershipSlugAction).
 */
final class MembershipSlugNotAllowedForRoleException extends DomainException
{
    public function __construct(
        private readonly int $membershipId,
        private readonly ?string $slug,
    ) {
        parent::__construct('Only professional memberships may have a public slug.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MembershipsSlugNotAllowedForRole;
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
