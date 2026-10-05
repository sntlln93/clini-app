<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;
use Carbon\CarbonImmutable;

/**
 * Inclusive local-date range (`from`/`to` are dates at local midnight in `timezone`), optionally narrowed to one organization.
 */
final readonly class StatsPeriodData implements Data
{
    public function __construct(
        public CarbonImmutable $from,
        public CarbonImmutable $to,
        public string $timezone,
        public ?int $organizationId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'from' => $this->from,
            'to' => $this->to,
            'timezone' => $this->timezone,
            'organizationId' => $this->organizationId,
        ];
    }
}
