<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Exceptions\Auth\UserBlockedException;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforces a platform-operator block on an already-open panel session:
 * runs right after `auth:sanctum` on every authenticated clinic route
 * except `POST /logout`. A blocked user is logged out of the `web` guard
 * only and rejected with 403 `auth.user_blocked`; the next request is a
 * plain 401.
 *
 * The session itself is never invalidated: an operator may be logged in
 * to the dashboard in the same browser session (ADR 0010). Sanctum's
 * `password_hash_web` is dropped with the web login, otherwise the next
 * clinic user to log in here could get the whole shared session flushed.
 */
class EnsureUserNotBlocked
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('web')->user();

        if ($user instanceof User && $user->blocked_at !== null) {
            Auth::guard('web')->logout();

            if ($request->hasSession()) {
                $request->session()->forget('password_hash_web');
            }

            throw new UserBlockedException($user->id);
        }

        return $next($request);
    }
}
