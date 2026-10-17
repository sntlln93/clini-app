<?php

declare(strict_types=1);

namespace App\Data\Auth;

use App\Contracts\Data;

final readonly class OrganizationOwnerRegistrationData implements Data
{
    public function __construct(
        public string $name,
        public string $email,
        public string $password,
        public string $organizationName,
        public string $timezone,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'email' => $this->email,
            'password' => $this->password,
            'organizationName' => $this->organizationName,
            'timezone' => $this->timezone,
        ];
    }
}
