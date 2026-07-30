<?php

declare(strict_types=1);

namespace App\Data\Auth;

use App\Contracts\Data;
use App\Models\User;

final readonly class EmailVerificationIssuanceData implements Data
{
    public function __construct(
        public User $user,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'user' => $this->user->id,
        ];
    }
}
