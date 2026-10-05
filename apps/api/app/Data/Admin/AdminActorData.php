<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;

/**
 * The operator performing an action, as recorded in the audit log.
 */
final readonly class AdminActorData implements Data
{
    public function __construct(
        public int $platformAdminId,
        public ?string $ip,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'platformAdminId' => $this->platformAdminId,
            'ip' => $this->ip,
        ];
    }
}
