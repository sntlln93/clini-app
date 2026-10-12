<?php

declare(strict_types=1);

namespace App\Data\Organizations;

use App\Contracts\Data;

final readonly class AcceptedInsuranceProviderSelectionData implements Data
{
    /**
     * @param  list<int>  $insuranceProviderIds
     */
    public function __construct(
        public int $organizationId,
        public array $insuranceProviderIds,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'insuranceProviderIds' => $this->insuranceProviderIds,
        ];
    }
}
