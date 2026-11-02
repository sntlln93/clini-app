<?php

declare(strict_types=1);

namespace App\Data\Auth;

use App\Contracts\Data;
use App\Models\User;

final readonly class PasswordChangeData implements Data
{
    public function __construct(
        public User $user,
        public string $password,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        // Never the password.
        return [
            'user' => $this->user->id,
        ];
    }
}
