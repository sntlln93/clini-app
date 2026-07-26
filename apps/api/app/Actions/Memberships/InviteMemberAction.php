<?php

declare(strict_types=1);

namespace App\Actions\Memberships;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Memberships\MembershipInvitationData;
use App\Mail\Memberships\MembershipInvitationMail;
use App\Models\MembershipInvitation;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Invalidates any pending (unaccepted) invitation for the same org+email
 * before issuing a new one, so resending never leaves two valid tokens
 * alive. The plaintext token only ever exists here and in the outgoing
 * email — the row itself stores just its hash.
 *
 * @implements Action<MembershipInvitationData>
 */
class InviteMemberAction implements Action
{
    /**
     * @param  MembershipInvitationData  $dto
     */
    public function handle(Data $dto): MembershipInvitation
    {
        MembershipInvitation::query()
            ->where('organization_id', $dto->organizationId)
            ->where('email', $dto->email)
            ->whereNull('accepted_at')
            ->delete();

        $plainToken = Str::random(40);

        $invitation = MembershipInvitation::create([
            'organization_id' => $dto->organizationId,
            'email' => $dto->email,
            'roles' => $dto->roles,
            'token' => hash('sha256', $plainToken),
            'expires_at' => now()->addDays(7),
        ]);

        /** @var array<int, string> $allowedOrigins */
        $allowedOrigins = config('cors.allowed_origins', []);
        $frontendUrl = $allowedOrigins[0] ?? 'http://localhost:5174';
        $acceptanceUrl = rtrim($frontendUrl, '/').'/invitaciones/'.$plainToken;

        Mail::to($dto->email)->send(new MembershipInvitationMail($invitation, $acceptanceUrl));

        return $invitation;
    }
}
