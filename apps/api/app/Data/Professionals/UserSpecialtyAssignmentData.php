<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;

final readonly class UserSpecialtyAssignmentData implements Data
{
    public function __construct(
        public int $userId,
        public int $specialtyId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'userId' => $this->userId,
            'specialtyId' => $this->specialtyId,
        ];
    }
}
