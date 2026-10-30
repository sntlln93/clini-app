<?php

declare(strict_types=1);

namespace App\Data\Auth;

use App\Contracts\Data;
use App\Models\User;

final readonly class TwoFactorConfirmationData implements Data
{
    public function __construct(
        public User $user,
        public string $code,
    ) {}

    /**
     * The code is a credential: it stays out of the array form.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'user_id' => $this->user->id,
        ];
    }
}
