<?php

declare(strict_types=1);

namespace App\Data\Auth;

use App\Contracts\Data;
use App\Models\User;

/**
 * The account a two-factor settings change applies to (#357): starting a
 * setup, turning the factor off or regenerating its recovery codes.
 */
final readonly class TwoFactorAccountData implements Data
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
