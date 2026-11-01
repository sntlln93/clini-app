<?php

declare(strict_types=1);

namespace App\Mail\Account;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Confirms a clinic user's account deletion request (#384): when it happens, and that logging in before then cancels it.
 *
 * Carries the name and the address as plain values, encrypted on the queue (#322), and waits for the commit.
 */
class AccountDeletionRequestedMail extends Mailable implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $name,
        public readonly string $deletesOn,
    ) {
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Pediste eliminar tu cuenta de Clini',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account-deletion-requested',
            with: [
                'name' => $this->name,
                'deletesOn' => $this->deletesOn,
                'loginUrl' => self::loginUrl(),
            ],
        );
    }

    private static function loginUrl(): string
    {
        /** @var array<int, string> $allowedOrigins */
        $allowedOrigins = config('cors.allowed_origins', []);

        return rtrim($allowedOrigins[0] ?? 'http://localhost:5174', '/').'/login';
    }
}
