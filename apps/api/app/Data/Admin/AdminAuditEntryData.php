<?php

declare(strict_types=1);

namespace App\Data\Admin;

use App\Contracts\Data;
use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;

/**
 * One `admin_audit_logs` row to record.
 */
final readonly class AdminAuditEntryData implements Data
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function __construct(
        public AdminActorData $actor,
        public AdminAuditAction $action,
        public ?AdminAuditSubject $subjectType,
        public ?int $subjectId,
        public array $metadata,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'actor' => $this->actor,
            'action' => $this->action,
            'subjectType' => $this->subjectType,
            'subjectId' => $this->subjectId,
            'metadata' => $this->metadata,
        ];
    }
}
