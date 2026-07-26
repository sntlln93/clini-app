<?php

declare(strict_types=1);

namespace App\Http\Controllers\Memberships;

use App\Actions\Memberships\AcceptInvitationAction;
use App\Data\Memberships\InvitationAcceptanceData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Memberships\AcceptInvitationRequest;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

/**
 * Fully public: no auth:sanctum, no organization middleware. Every failure
 * path returns the same generic Spanish message regardless of whether the
 * token is malformed, expired, already used, or simply never existed —
 * never revealing whether the underlying email is registered.
 */
class InvitationAcceptanceController extends Controller
{
    public function show(string $token): JsonResponse
    {
        $invitation = $this->findValidInvitation($token);

        return response()->json([
            'email' => $invitation->email,
            'organization_name' => $invitation->organization?->name,
            'requires_registration' => ! User::where('email', $invitation->email)->exists(),
        ]);
    }

    public function store(AcceptInvitationRequest $request, string $token, AcceptInvitationAction $action): JsonResponse
    {
        $membership = $action->handle(new InvitationAcceptanceData(
            token: $token,
            name: $request->string('name')->toString() ?: null,
            password: $request->string('password')->toString() ?: null,
        ));

        Auth::guard('web')->login($this->authenticatedUser($membership));
        $request->session()->regenerate();

        return response()->json(['message' => 'Invitación aceptada.']);
    }

    private function authenticatedUser(Membership $membership): User
    {
        $user = $membership->user;

        if ($user === null) {
            abort(500, 'No se pudo autenticar al usuario invitado.');
        }

        return $user;
    }

    private function findValidInvitation(string $token): MembershipInvitation
    {
        $invitation = MembershipInvitation::query()
            ->where('token', hash('sha256', $token))
            ->whereNull('accepted_at')
            ->first();

        if ($invitation === null || $invitation->isExpired()) {
            abort(404, 'La invitación no es válida o ya expiró.');
        }

        return $invitation;
    }
}
