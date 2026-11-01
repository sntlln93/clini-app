<?php

declare(strict_types=1);

namespace App\Data\Account;

use App\Contracts\Data;
use App\Models\User;

/**
 * A clinic user's request to delete their own account (#384). The password was checked by the FormRequest; with the
 * second factor on, exactly one of an authenticator code or a recovery code comes along.
 */
final readonly class AccountDeletionRequestData implements Data
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
