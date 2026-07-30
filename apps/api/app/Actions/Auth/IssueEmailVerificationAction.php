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
 * Mints the one-time email-verification token, persists only its hash plus
 * a 48h expiry on the user row, and queues the confirmation mail. The
 * plaintext token only ever exists here and in the outgoing (queued) mail
 * payload — never on the user row.
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
