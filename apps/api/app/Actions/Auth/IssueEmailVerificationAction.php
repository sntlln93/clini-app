<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Auth\EmailVerificationIssuanceData;
use App\Mail\Auth\EmailVerificationMail;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

/**
 * Mints the token, persists only its hash + 48h expiry, and queues the mail.
 * The plaintext token only ever exists here and in the queued mail payload.
 *
 * @implements Action<EmailVerificationIssuanceData>
 */
class IssueEmailVerificationAction implements Action
{
    /**
     * @param  EmailVerificationIssuanceData  $dto
     */
    public function handle(Data $dto): User
    {
        $user = $dto->user;

        $plainToken = Str::random(40);

        $user->forceFill([
            'email_verification_token' => hash('sha256', $plainToken),
            'email_verification_token_expires_at' => now()->addHours(48),
        ])->save();

        /** @var array<int, string> $allowedOrigins */
        $allowedOrigins = config('cors.allowed_origins', []);
        $frontendUrl = $allowedOrigins[0] ?? 'http://localhost:5174';
        $verificationUrl = rtrim($frontendUrl, '/').'/verificar-email/'.$plainToken;

        Mail::to($user->email)->queue(new EmailVerificationMail($user, $verificationUrl));

        return $user;
    }
}
