<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;

/**
 * A new platform operator; `email` is already trimmed and lowercased by `admin:create`.
 */
final readonly class PlatformAdminRegistrationData implements Data
{
    public function __construct(
        public string $name,
        public string $email,
        public string $password,
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
        ];
    }
}
