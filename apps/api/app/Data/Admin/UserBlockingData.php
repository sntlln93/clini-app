<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;

final readonly class UserBlockingData implements Data
{
    public function __construct(
        public AdminActorData $actor,
        public int $userId,
        public string $reason,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'actor' => $this->actor,
            'userId' => $this->userId,
            'reason' => $this->reason,
        ];
    }
}
