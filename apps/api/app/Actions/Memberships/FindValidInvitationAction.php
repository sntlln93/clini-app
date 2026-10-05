<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Memberships\InvitationTokenData;
use App\Exceptions\Memberships\InvitationInvalidOrExpiredException;
use App\Models\MembershipInvitation;

/**
 * @implements Action<InvitationTokenData>
 */
class FindValidInvitationAction implements Action
{
    /**
     * @param  InvitationTokenData  $dto
     */
    public function handle(Data $dto): MembershipInvitation
    {
        $tokenHash = hash('sha256', $dto->token);

        $invitation = MembershipInvitation::query()
            ->where('token', $tokenHash)
            ->whereNull('accepted_at')
            ->first();

        // A suspended organization's pending invitations are dead too: the
        // same generic error, so the invitee learns nothing about the
        // suspension (AcceptInvitationAction re-checks it under lock).
        if ($invitation === null
            || $invitation->isExpired()
            || $invitation->organization?->suspended_at !== null
        ) {
            throw new InvitationInvalidOrExpiredException($tokenHash);
        }

        return $invitation;
    }
}
