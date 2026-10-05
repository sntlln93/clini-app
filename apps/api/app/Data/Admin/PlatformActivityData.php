<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;
use Carbon\CarbonImmutable;

/**
 * One item of the overview's recent-activity feed.
 */
final readonly class PlatformActivityData implements Data
{
    public function __construct(
        public string $kind,
        public CarbonImmutable $occurredAt,
        public string $subjectType,
        public int $subjectId,
        public string $subjectLabel,
        public ?string $detail,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'kind' => $this->kind,
            'occurredAt' => $this->occurredAt,
            'subjectType' => $this->subjectType,
            'subjectId' => $this->subjectId,
            'subjectLabel' => $this->subjectLabel,
            'detail' => $this->detail,
        ];
    }
}
