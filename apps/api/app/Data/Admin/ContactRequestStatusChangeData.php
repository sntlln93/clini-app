<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;
use App\Enums\ContactRequestStatus;

final readonly class ContactRequestStatusChangeData implements Data
{
    public function __construct(
        public AdminActorData $actor,
        public int $contactRequestId,
        public ContactRequestStatus $status,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'actor' => $this->actor,
            'contactRequestId' => $this->contactRequestId,
            'status' => $this->status,
        ];
    }
}
