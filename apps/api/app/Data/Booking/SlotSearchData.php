<?php

declare(strict_types=1);

namespace App\Data\Booking;

use App\Contracts\Data;
use Carbon\CarbonImmutable;

final readonly class SlotSearchData implements Data
{
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public int $serviceId,
        public CarbonImmutable $from,
        public CarbonImmutable $to,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'serviceId' => $this->serviceId,
            'from' => $this->from,
            'to' => $this->to,
        ];
    }
}
