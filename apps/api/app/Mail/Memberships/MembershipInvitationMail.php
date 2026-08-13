<?php

declare(strict_types=1);

namespace App\Mail\Memberships;

use App\Models\MembershipInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Dispatched synchronously (no queues) by InviteMemberAction. Carries the only
 * plaintext copy of the acceptance URL — the invitation persists just its hash.
 */
class MembershipInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly MembershipInvitation $invitation,
        public readonly string $acceptanceUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Invitación para unirte a una organización en Clini',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.membership-invitation',
            with: [
                'organizationName' => $this->invitation->organization?->name,
                'acceptanceUrl' => $this->acceptanceUrl,
            ],
        );
    }
}
