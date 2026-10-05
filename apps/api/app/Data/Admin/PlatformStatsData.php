<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;

/**
 * Output of ComputePlatformStatsAction; each section follows the REST contract shape verbatim.
 */
final readonly class PlatformStatsData implements Data
{
    /**
     * @param  array<string, mixed>  $period
     * @param  array<string, mixed>  $appointments
     * @param  array<string, mixed>  $patients
     * @param  array<string, mixed>  $reminders
     */
    public function __construct(
        public array $period,
        public array $appointments,
        public array $patients,
        public array $reminders,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'period' => $this->period,
            'appointments' => $this->appointments,
            'patients' => $this->patients,
            'reminders' => $this->reminders,
        ];
    }
}
