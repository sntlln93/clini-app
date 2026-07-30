<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\VerifyEmailAction;
use App\Data\Auth\EmailVerificationData;
use App\Exceptions\Auth\EmailVerificationInvalidOrExpiredException;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * Fully public: no auth:sanctum. Every failure path returns the same
 * generic Spanish message regardless of whether the token is malformed,
 * expired, already used, or simply never existed.
 */
class EmailVerificationController extends Controller
{
    public function show(string $token): JsonResponse
    {
        $user = $this->findValidUser($token);

        return response()->json([
            'email' => $user->email,
        ]);
    }

    public function store(Request $request, string $token, VerifyEmailAction $action): JsonResponse
    {
        $user = $action->handle(new EmailVerificationData($token));

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->json(['message' => 'Correo confirmado.']);
    }

    private function findValidUser(string $token): User
    {
        $tokenHash = hash('sha256', $token);

        $user = User::query()
            ->where('email_verification_token', $tokenHash)
            ->first();

        $expiresAt = $user?->email_verification_token_expires_at;

        if ($user === null || $expiresAt === null) {
            throw new EmailVerificationInvalidOrExpiredException($tokenHash);
        }

        /** @var Carbon $expiresAt */
        if ($expiresAt->isPast()) {
            throw new EmailVerificationInvalidOrExpiredException($tokenHash);
        }

        return $user;
    }
}
