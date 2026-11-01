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
 * Logs a blocked user out of the `web` guard only, never invalidating the
 * session an operator may share (ADR 0010).
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
