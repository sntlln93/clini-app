<?php

declare(strict_types=1);

namespace App\Actions\Admin;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Admin\AdminAuditEntryData;
use App\Models\AdminAuditLog;
use stdClass;

/**
 * The only writer of `admin_audit_logs`. Every mutating operator Action
 * calls it inside its own transaction, after the mutation, so the change
 * and its audit row commit or roll back together.
 *
 * @implements Action<AdminAuditEntryData>
 */
class RecordAdminAuditAction implements Action
{
    /**
     * @param  AdminAuditEntryData  $dto
     */
    public function handle(Data $dto): AdminAuditLog
    {
        return AdminAuditLog::query()->create([
            'platform_admin_id' => $dto->actor->platformAdminId,
            'action' => $dto->action,
            'subject_type' => $dto->subjectType,
            'subject_id' => $dto->subjectId,
            // Stored as a JSON object even when empty (`{}`, never `[]`).
            'metadata' => $dto->metadata === [] ? new stdClass : $dto->metadata,
            'ip' => $dto->actor->ip,
        ]);
    }
}
