<?php

declare(strict_types=1);

namespace App\Data\Account;

use App\Contracts\Data;
use App\Models\User;

/** A completed login, which cancels the user's pending account deletion, if any (#384). */
final readonly class AccountDeletionCancellationData implements Data
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
            'user_id' => $this->user->id,
        ];
    }
}
