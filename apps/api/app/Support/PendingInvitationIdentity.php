<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Memberships\InvitationIdentityData;
use App\Models\MembershipInvitation;
use Illuminate\Http\Request;

/**
 * The identity a professional invitation's DNI found (#417), kept in the session between the lookup and the
 * acceptance: the DNI never travels back to the browser, and the acceptance never asks the registry again. Only for
 * the invitation it was looked up for, and short-lived, like a pending two-factor login. The session is encrypted.
 */
final class PendingInvitationIdentity
{
    private const string SESSION_KEY = 'invitation.identity';

    private const int TTL_MINUTES = 30;

    /**
     * A stateless request (no SPA origin) keeps nothing, so its acceptance asks for the DNI again.
     */
    public static function start(Request $request, InvitationIdentityData $identity): void
    {
        if (! $request->hasSession()) {
            return;
        }

        $request->session()->put(self::SESSION_KEY, [
            'invitation_id' => $identity->invitationId,
            'document_number' => $identity->documentNumber,
            'name' => $identity->name,
            'user_id' => $identity->userId,
            'expires_at' => now()->addMinutes(self::TTL_MINUTES)->getTimestamp(),
        ]);
    }

    /**
     * A stateless request (no SPA origin, so no session) has none.
     */
    public static function for(Request $request, MembershipInvitation $invitation): ?InvitationIdentityData
    {
        if (! $request->hasSession()) {
            return null;
        }

        $pending = $request->session()->get(self::SESSION_KEY);

        if (! is_array($pending)
            || ($pending['invitation_id'] ?? null) !== $invitation->id
            || ! is_int($pending['expires_at'] ?? null) || $pending['expires_at'] <= now()->getTimestamp()
            || ! is_string($pending['document_number'] ?? null) || ! is_string($pending['name'] ?? null)
        ) {
            return null;
        }

        $userId = $pending['user_id'] ?? null;

        return new InvitationIdentityData(
            invitationId: $invitation->id,
            documentNumber: $pending['document_number'],
            name: $pending['name'],
            userId: is_int($userId) ? $userId : null,
        );
    }

    public static function clear(Request $request): void
    {
        if ($request->hasSession()) {
            $request->session()->forget(self::SESSION_KEY);
        }
    }
}
