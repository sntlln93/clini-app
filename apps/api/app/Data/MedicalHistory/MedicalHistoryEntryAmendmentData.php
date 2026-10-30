<?php

declare(strict_types=1);

namespace App\Data\MedicalHistory;

use App\Contracts\Data;

final readonly class MedicalHistoryEntryAmendmentData implements Data
{
    public function __construct(
        public int $entryId,
        public int $membershipId,
        public MedicalHistoryContentData $content,
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
            'content' => $this->content->toArray(),
            'reason' => $this->reason,
        ];
    }
}
