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
 * Confirms a clinic user's account was deleted (#384). Queued before the address is erased, so it is the last mail
 * that address gets.
 *
 * Carries the name and the address as plain values, encrypted on the queue (#322), and waits for the commit.
 */
class AccountDeletedMail extends Mailable implements ShouldBeEncrypted, ShouldQueue
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
            subject: 'Eliminamos tu cuenta de Clini',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account-deleted',
            with: [
                'name' => $this->name,
            ],
        );
    }
}
