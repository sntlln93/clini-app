<?php

declare(strict_types=1);

namespace App\Data\Contact;

use App\Contracts\Data;
use App\Enums\Plan;

final readonly class ContactRequestData implements Data
{
    public function __construct(
        public string $name,
        public string $email,
        public ?string $phone,
        public ?string $organizationName,
        public ?int $teamSize,
        public ?Plan $plan,
        public string $message,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'organizationName' => $this->organizationName,
            'teamSize' => $this->teamSize,
            'plan' => $this->plan,
            'message' => $this->message,
        ];
    }
}
