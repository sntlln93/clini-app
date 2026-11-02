<?php

declare(strict_types=1);

namespace App\Mail\Auth;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * The password reset link (#389), queued by SendPasswordResetLinkAction. Encrypted on the queue: the payload holds
 * the plaintext token and the recipient's address, in `jobs` and, if it fails, in `failed_jobs` (#322).
 */
class PasswordResetMail extends Mailable implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $name,
        public readonly string $resetUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Restablecé tu contraseña de Clini',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password-reset',
            with: [
                'name' => $this->name,
                'resetUrl' => $this->resetUrl,
            ],
        );
    }
}
