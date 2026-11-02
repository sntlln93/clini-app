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
 * Tells a clinic user a login cancelled their pending account deletion (#384): whichever way they logged in, and in
 * case it wasn't them.
 *
 * Carries the name and the address as plain values, encrypted on the queue (#322), and waits for the commit.
 */
class AccountDeletionCancelledMail extends Mailable implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $name,
    ) {
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Cancelamos la eliminación de tu cuenta de Clini',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account-deletion-cancelled',
            with: [
                'name' => $this->name,
            ],
        );
    }
}
