<?php

declare(strict_types=1);

namespace App\Data\Media;

use App\Contracts\Data;

/** A pending deletion of a media object that may be due (#410). */
final readonly class MediaObjectDeletionData implements Data
{
    public function __construct(
        public int $deletionId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'deletion_id' => $this->deletionId,
        ];
    }
}
