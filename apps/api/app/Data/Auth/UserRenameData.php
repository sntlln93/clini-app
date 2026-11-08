<?php

declare(strict_types=1);

namespace App\Data\Auth;

use App\Contracts\Data;

/**
 * A clinic user's new name, set by support (#417).
 */
final readonly class UserRenameData implements Data
{
    public function __construct(
        public int $userId,
        public string $name,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['userId' => $this->userId];
    }
}
