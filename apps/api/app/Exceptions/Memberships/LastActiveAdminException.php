<?php

declare(strict_types=1);

namespace App\Exceptions\Memberships;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * CU-04/CU-05 invariant; reused as-is by both DeactivateMembershipAction and UpdateMembershipAction.
 */
final class LastActiveAdminException extends DomainException
{
    public function __construct(
        private readonly int $membershipId,
        private readonly int $organizationId,
    ) {
        parent::__construct('The organization must keep at least one active owner or admin.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::MembershipsLastActiveAdmin;
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
            'organization_id' => $this->organizationId,
        ];
    }
}
