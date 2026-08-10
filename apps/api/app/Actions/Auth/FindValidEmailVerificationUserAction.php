<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Auth\EmailVerificationData;
use App\Exceptions\Auth\EmailVerificationInvalidOrExpiredException;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * @implements Action<EmailVerificationData>
 */
class FindValidEmailVerificationUserAction implements Action
{
    /**
     * @param  EmailVerificationData  $dto
     */
    public function handle(Data $dto): User
    {
        $tokenHash = hash('sha256', $dto->token);

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
