<?php

declare(strict_types=1);

namespace App\Mail\Account;

use App\Enums\ErrorCode;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Tells a clinic user their account deletion didn't run at its deadline (#384): something it can't resolve stood in
 * the way, so the account stays as it was.
 *
 * Carries the name and the address as plain values, encrypted on the queue (#322), and waits for the commit.
 */
class AccountDeletionVoidedMail extends Mailable implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  array<int, string>  $organizationNames
     */
    public function __construct(
        public readonly string $name,
        public readonly ErrorCode $reason,
        public readonly array $organizationNames,
    ) {
        $this->afterCommit();
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'No pudimos eliminar tu cuenta de Clini',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account-deletion-voided',
            with: [
                'name' => $this->name,
                'lastAdmin' => $this->reason === ErrorCode::AccountDeletionLastActiveAdmin,
                'organizationNames' => $this->organizationNames,
            ],
        );
    }
}
