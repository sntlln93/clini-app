<?php

declare(strict_types=1);

namespace App\Data\ClinicalAccess;

use App\Contracts\Data;

/**
 * Whether the acting membership may read a patient's clinical history, and whether reading it now takes a reason
 * (#325, ADR 0022).
 */
final readonly class ClinicalAccessStateData implements Data
{
    public function __construct(
        public bool $canView,
        public bool $reasonRequired,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'canView' => $this->canView,
            'reasonRequired' => $this->reasonRequired,
        ];
    }
}
