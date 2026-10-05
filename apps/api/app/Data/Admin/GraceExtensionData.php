<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;
use Carbon\CarbonImmutable;

/**
 * `graceEndsAt` is already the UTC instant of the chosen day's 23:59:59 in the reporting timezone.
 */
final readonly class GraceExtensionData implements Data
{
    public function __construct(
        public AdminActorData $actor,
        public int $subscriptionId,
        public CarbonImmutable $graceEndsAt,
        public ?string $note,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'actor' => $this->actor,
            'subscriptionId' => $this->subscriptionId,
            'graceEndsAt' => $this->graceEndsAt,
            'note' => $this->note,
        ];
    }
}
