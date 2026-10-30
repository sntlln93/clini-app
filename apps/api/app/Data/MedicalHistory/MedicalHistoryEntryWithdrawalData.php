<?php

declare(strict_types=1);

namespace App\Data\MedicalHistory;

use App\Contracts\Data;

final readonly class MedicalHistoryEntryWithdrawalData implements Data
{
    public function __construct(
        public int $entryId,
        public int $membershipId,
        public ?string $reason,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'entryId' => $this->entryId,
            'membershipId' => $this->membershipId,
            'reason' => $this->reason,
        ];
    }
}
