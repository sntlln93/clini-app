<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;

/**
 * A successful operator login, after the guard already authenticated it.
 */
final readonly class PlatformAdminLoginData implements Data
{
    public function __construct(
        public AdminActorData $actor,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'actor' => $this->actor,
        ];
    }
}
