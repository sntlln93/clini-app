<?php

declare(strict_types=1);

namespace App\Data\Auth;

use App\Contracts\Data;

final readonly class PasswordResetData implements Data
{
    public function __construct(
        public string $email,
        public string $token,
        public string $password,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        // Never the token nor the password.
        return [
            'email' => $this->email,
        ];
    }
}
