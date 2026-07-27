<?php

declare(strict_types=1);

namespace App\Data\Memberships;

use App\Contracts\Data;

final readonly class InvitationAcceptanceData implements Data
{
    public function __construct(
        public string $token,
        public ?string $name,
        public ?string $password,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'token' => $this->token,
            'name' => $this->name,
            'password' => $this->password,
        ];
    }
}
