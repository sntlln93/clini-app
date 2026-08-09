<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Auth\EmailVerificationData;
use App\Exceptions\Auth\EmailVerificationInvalidOrExpiredException;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Nulls out both verification columns so the token can never be replayed;
 * looks the user up under `lockForUpdate()` so concurrent POSTs can't both succeed.
 *
 * @implements Action<EmailVerificationData>
 */
class VerifyEmailAction implements Action
{
    /**
     * @param  EmailVerificationData  $dto
     */
    public function handle(Data $dto): User
    {
        return DB::transaction(function () use ($dto): User {
            $tokenHash = hash('sha256', $dto->token);

            $user = User::query()
                ->where('email_verification_token', $tokenHash)
                ->lockForUpdate()
                ->first();

            $expiresAt = $user?->email_verification_token_expires_at;

            if ($user === null || $expiresAt === null) {
                throw new EmailVerificationInvalidOrExpiredException($tokenHash);
            }

            /** @var Carbon $expiresAt */
            if ($expiresAt->isPast()) {
                throw new EmailVerificationInvalidOrExpiredException($tokenHash);
            }

            $user->forceFill([
                'email_verified_at' => now(),
                'email_verification_token' => null,
                'email_verification_token_expires_at' => null,
            ])->save();

            return $user;
        });
    }
}
