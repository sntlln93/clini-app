<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;

/**
 * The login of a user with two-factor authentication on (#357), between the
 * password and the code: kept in the session, never as an authenticated
 * guard, so nothing behind `auth:sanctum` answers until the code is in.
 */
final class PendingTwoFactorLogin
{
    private const SESSION_KEY = 'login.two_factor';

    // Long enough to open the authenticator app, short enough that a
    // forgotten tab doesn't keep a verified password around.
    private const TTL_MINUTES = 10;

    public static function start(Request $request, User $user): void
    {
        $request->session()->put(self::SESSION_KEY, [
            'user_id' => $user->id,
            'expires_at' => now()->addMinutes(self::TTL_MINUTES)->getTimestamp(),
        ]);
    }

    /**
     * The pending user's id, or `null` when there is none or it expired. A
     * stateless request (no SPA origin, so no session) has none either.
     */
    public static function userId(Request $request): ?int
    {
        if (! $request->hasSession()) {
            return null;
        }

        $pending = $request->session()->get(self::SESSION_KEY);

        if (! is_array($pending) || ! is_int($pending['user_id'] ?? null) || ! is_int($pending['expires_at'] ?? null)) {
            return null;
        }

        return $pending['expires_at'] > now()->getTimestamp() ? $pending['user_id'] : null;
    }

    public static function user(Request $request): ?User
    {
        $userId = self::userId($request);

        return $userId === null ? null : User::query()->find($userId);
    }

    public static function clear(Request $request): void
    {
        if ($request->hasSession()) {
            $request->session()->forget(self::SESSION_KEY);
        }
    }
}
