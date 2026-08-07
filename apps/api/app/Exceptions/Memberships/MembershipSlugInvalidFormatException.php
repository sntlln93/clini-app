<?php

declare(strict_types=1);

namespace App\Exceptions\Memberships;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * Format: lowercase letters/digits/hyphens, alphanumeric start/end, no consecutive hyphens, 3–50 chars — SetMembershipSlugAction.
 */
final class MembershipSlugInvalidFormatException extends DomainException
{
    public function __construct(
        private readonly int $membershipId,
        private readonly string $slug,
    ) {
        parent::__construct('The slug does not match the required format.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MembershipsSlugInvalidFormat;
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
