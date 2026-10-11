<?php

declare(strict_types=1);

namespace App\Data\Booking;

use App\Contracts\Data;

final readonly class PublishedScheduleData implements Data
{
    /**
     * @param  array<int, int>  $membershipIds
     * @param  string  $fromDate  first local calendar day, Y-m-d
     * @param  string  $toDate  last local calendar day (inclusive), Y-m-d
     */
    public function __construct(
        public int $organizationId,
        public array $membershipIds,
        public string $fromDate,
        public string $toDate,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipIds' => $this->membershipIds,
            'fromDate' => $this->fromDate,
            'toDate' => $this->toDate,
        ];
    }
}
