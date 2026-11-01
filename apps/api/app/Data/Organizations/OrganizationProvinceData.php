<?php

declare(strict_types=1);

namespace App\Data\Organizations;

use App\Contracts\Data;
use App\Enums\Province;

/**
 * The province where a practice attends, as its owner declares it (#380); null takes it away.
 */
final readonly class OrganizationProvinceData implements Data
{
    public function __construct(
        public int $organizationId,
        public ?Province $province,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'province' => $this->province?->value,
        ];
    }
}
