<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;

/**
 * How many recent platform events to merge into the activity feed.
 */
final readonly class ActivityFeedQueryData implements Data
{
    public function __construct(
        public int $limit,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'limit' => $this->limit,
        ];
    }
}
