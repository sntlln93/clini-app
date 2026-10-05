<?php

declare(strict_types=1);

namespace App\Http\Resources\Admin;

use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Models\AdminAuditLog;
use App\Models\PlatformAdmin;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Expects the `platformAdmin` relation to be loaded.
 *
 * @mixin AdminAuditLog
 */
class AdminAuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var AdminAuditLog $log */
        $log = $this->resource;

        /** @var AdminAuditAction $action */
        $action = $log->action;

        /** @var AdminAuditSubject|null $subjectType */
        $subjectType = $log->subject_type;

        /** @var array<string, mixed> $metadata */
        $metadata = $log->metadata ?? [];

        /** @var PlatformAdmin $admin */
        $admin = $log->platformAdmin;

        /** @var CarbonImmutable $createdAt */
        $createdAt = $log->created_at;

        $label = $metadata['subject_label'] ?? null;

        return [
            'id' => $log->id,
            'action' => $action->value,
            'platform_admin' => (new AdminRefResource($admin))->toArray($request),
            'subject' => $subjectType === null || $log->subject_id === null ? null : [
                'type' => $subjectType->value,
                'id' => (int) $log->subject_id,
                'label' => is_string($label) ? $label : null,
            ],
            'metadata' => (object) $metadata,
            'ip' => $log->ip,
            'created_at' => $createdAt->toIso8601String(),
        ];
    }
}
