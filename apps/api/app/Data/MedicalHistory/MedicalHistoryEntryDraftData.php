<?php

declare(strict_types=1);

namespace App\Data\MedicalHistory;

use App\Contracts\Data;
use App\Enums\MedicalHistoryCategory;

final readonly class MedicalHistoryEntryDraftData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $appointmentId,
        public int $patientId,
        public int $membershipId,
        public MedicalHistoryCategory $category,
        public MedicalHistoryContentData $content,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'appointmentId' => $this->appointmentId,
            'patientId' => $this->patientId,
            'membershipId' => $this->membershipId,
            'category' => $this->category->value,
            'content' => $this->content->toArray(),
        ];
    }
}
