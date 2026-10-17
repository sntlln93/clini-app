<?php

declare(strict_types=1);

namespace App\Mail\Contact;

use App\Enums\Plan;
use App\Models\ContactRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Queued by ReceiveContactRequestAction to the team address in
 * config/contact.php. Replying answers the visitor directly.
 */
class ContactRequestReceivedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ContactRequest $contactRequest,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: [new Address($this->contactRequest->email, $this->contactRequest->name)],
            subject: "Nueva consulta comercial de {$this->contactRequest->name}",
        );
    }

    public function content(): Content
    {
        /** @var Plan|null $plan */
        $plan = $this->contactRequest->plan;

        /** @var list<string> $dashboardOrigins */
        $dashboardOrigins = config('admin.allowed_origins', []);

        return new Content(
            view: 'emails.contact-request-received',
            with: [
                'contactRequest' => $this->contactRequest,
                'planLabel' => match ($plan) {
                    Plan::Free => 'Gratis',
                    Plan::Practice => 'Consultorio',
                    Plan::Center => 'Centro',
                    null => 'Sin definir',
                },
                'inboxUrl' => isset($dashboardOrigins[0]) ? rtrim($dashboardOrigins[0], '/').'/contactos' : null,
            ],
        );
    }
}
