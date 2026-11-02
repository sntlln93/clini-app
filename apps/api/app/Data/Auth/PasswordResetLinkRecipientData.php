<?php

declare(strict_types=1);

namespace App\Data\Auth;

use App\Contracts\Data;

final readonly class PasswordResetLinkRecipientData implements Data
{
    public function __construct(
        public string $email,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'email' => $this->email,
        ];
    }
}
