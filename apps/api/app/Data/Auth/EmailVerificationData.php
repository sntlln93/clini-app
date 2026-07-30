<?php

declare(strict_types=1);

namespace App\Data\Auth;

use App\Contracts\Data;

final readonly class EmailVerificationData implements Data
{
    public function __construct(
        public string $token,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'token' => $this->token,
        ];
    }
}
