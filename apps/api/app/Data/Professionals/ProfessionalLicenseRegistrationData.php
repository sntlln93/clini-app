<?php

declare(strict_types=1);

namespace App\Data\Professionals;

use App\Contracts\Data;
use App\Enums\HealthProfession;
use App\Enums\Province;

/**
 * A license a professional declares (#380).
 */
final readonly class ProfessionalLicenseRegistrationData implements Data
{
    public function __construct(
        public int $userId,
        public string $number,
        public Province $province,
        public HealthProfession $profession,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'userId' => $this->userId,
            'number' => $this->number,
            'province' => $this->province->value,
            'profession' => $this->profession->value,
        ];
    }
}
