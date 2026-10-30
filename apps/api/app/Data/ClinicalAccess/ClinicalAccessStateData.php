<?php

declare(strict_types=1);

namespace App\Data\ClinicalAccess;

use App\Contracts\Data;

/**
 * Whether the acting membership may read a patient's clinical history, whether reading it now takes a reason (#325,
 * ADR 0022), and whether another professional's records stay out of it until the patient shares their code (#364,
 * ADR 0029).
 */
final readonly class ClinicalAccessStateData implements Data
{
    public function __construct(
        public bool $canView,
        public bool $reasonRequired,
        public bool $recordsHidden,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'canView' => $this->canView,
            'reasonRequired' => $this->reasonRequired,
            'recordsHidden' => $this->recordsHidden,
        ];
    }
}
