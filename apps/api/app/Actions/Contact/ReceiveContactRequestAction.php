<?php

declare(strict_types=1);

namespace App\Actions\Contact;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Contact\ContactRequestData;
use App\Mail\Contact\ContactRequestReceivedMail;
use App\Models\ContactRequest;
use Illuminate\Support\Facades\Mail;

/**
 * Stores a request from the landing's contact form and, when a team address
 * is configured, queues the mail that announces it.
 *
 * @implements Action<ContactRequestData>
 */
class ReceiveContactRequestAction implements Action
{
    /**
     * @param  ContactRequestData  $dto
     */
    public function handle(Data $dto): ContactRequest
    {
        $contactRequest = ContactRequest::query()->create([
            'name' => $dto->name,
            'email' => $dto->email,
            'phone' => $dto->phone,
            'organization_name' => $dto->organizationName,
            'team_size' => $dto->teamSize,
            'plan' => $dto->plan,
            'message' => $dto->message,
        ]);

        $address = config('contact.notification_email');

        if (is_string($address) && $address !== '') {
            Mail::to($address)->queue(new ContactRequestReceivedMail($contactRequest));
        }

        return $contactRequest;
    }
}
