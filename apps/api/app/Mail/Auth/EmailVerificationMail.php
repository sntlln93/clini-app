<?php

declare(strict_types=1);

namespace App\Mail\Auth;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatched via the `database` queue by IssueEmailVerificationAction.
 * Encrypted on the queue: the payload holds the plaintext token and the
 * recipient's address, in `jobs` and, if it fails, in `failed_jobs` (#322).
 */
class EmailVerificationMail extends Mailable implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $user,
        public readonly string $verificationUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Confirmá tu correo en Clini',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.email-verification',
            with: [
                'name' => $this->user->name,
                'verificationUrl' => $this->verificationUrl,
            ],
        );
    }
}
