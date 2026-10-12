<?php

declare(strict_types=1);

namespace App\Data\Appointments;

use App\Contracts\Data;
use Carbon\CarbonImmutable;

/**
 * An appointment as a calendar event (#295): what the patient's
 * «Agregar a Google Calendar» link and `.ics` attachment carry.
 */
final readonly class CalendarEventData implements Data
{
    public function __construct(
        public string $uid,
        public string $title,
        public string $description,
        public ?string $location,
        public CarbonImmutable $startAt,
        public CarbonImmutable $endAt,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'uid' => $this->uid,
            'title' => $this->title,
            'description' => $this->description,
            'location' => $this->location,
            'startAt' => $this->startAt,
            'endAt' => $this->endAt,
        ];
    }
}
