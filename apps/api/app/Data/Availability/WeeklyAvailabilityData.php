<?php

declare(strict_types=1);

namespace App\Data\Availability;

use App\Contracts\Data;

/**
 * A membership's whole weekly schedule, which replaces the stored one.
 */
final readonly class WeeklyAvailabilityData implements Data
{
    /**
     * @param  list<AvailabilitySlotData>  $slots
     */
    public function __construct(
        public int $organizationId,
        public int $membershipId,
        public array $slots,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'organizationId' => $this->organizationId,
            'membershipId' => $this->membershipId,
            'slots' => array_map(fn (AvailabilitySlotData $slot): array => $slot->toArray(), $this->slots),
        ];
    }
}
