<?php

declare(strict_types=1);

namespace App\Data\Auth;

use App\Contracts\Data;
use App\Models\User;

/**
 * The login's second step: exactly one of an authenticator code or a
 * recovery code.
 */
final readonly class TwoFactorChallengeData implements Data
{
    public function __construct(
        public User $user,
        public ?string $code,
        public ?string $recoveryCode,
    ) {}

    /**
     * The codes are credentials: only which kind was sent goes here.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'user_id' => $this->user->id,
            'with_recovery_code' => $this->recoveryCode !== null,
        ];
    }
}
