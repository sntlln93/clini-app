<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;

/**
 * Support taking a settled DNI away (#387).
 */
final readonly class ProfessionalDocumentResetData implements Data
{
    public function __construct(
        public int $userId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['userId' => $this->userId];
    }
}
