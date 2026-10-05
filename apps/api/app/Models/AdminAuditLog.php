<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use Carbon\CarbonImmutable;
use Database\Factories\AdminAuditLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only: no updated_at, and RecordAdminAuditAction is its only writer.
 */
#[Fillable(['platform_admin_id', 'action', 'subject_type', 'subject_id', 'metadata', 'ip'])]
class AdminAuditLog extends Model
{
    /** @use HasFactory<AdminAuditLogFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'action' => AdminAuditAction::class,
            'subject_type' => AdminAuditSubject::class,
            'metadata' => 'array',
            'created_at' => 'immutable_datetime',
        ];
    }

    /**
     * @return BelongsTo<PlatformAdmin, $this>
     */
    public function platformAdmin(): BelongsTo
    {
        return $this->belongsTo(PlatformAdmin::class);
    }

    /**
     * @param  Builder<AdminAuditLog>  $query
     * @return Builder<AdminAuditLog>
     */
    public function scopeForAction(Builder $query, ?AdminAuditAction $action): Builder
    {
        return $action === null ? $query : $query->where('action', $action);
    }

    /**
     * @param  Builder<AdminAuditLog>  $query
     * @return Builder<AdminAuditLog>
     */
    public function scopeForSubject(Builder $query, ?AdminAuditSubject $type, ?int $id): Builder
    {
        if ($type === null) {
            return $query;
        }

        $query->where('subject_type', $type);

        return $id === null ? $query : $query->where('subject_id', $id);
    }

    /**
     * @param  Builder<AdminAuditLog>  $query
     * @return Builder<AdminAuditLog>
     */
    public function scopeByAdmin(Builder $query, ?int $platformAdminId): Builder
    {
        return $platformAdminId === null ? $query : $query->where('platform_admin_id', $platformAdminId);
    }

    /**
     * Half-open UTC range: [$fromUtc, $toUtcExclusive); either bound may be open.
     *
     * @param  Builder<AdminAuditLog>  $query
     * @return Builder<AdminAuditLog>
     */
    public function scopeCreatedBetween(Builder $query, ?CarbonImmutable $fromUtc, ?CarbonImmutable $toUtcExclusive): Builder
    {
        if ($fromUtc !== null) {
            $query->where('created_at', '>=', $fromUtc);
        }

        if ($toUtcExclusive !== null) {
            $query->where('created_at', '<', $toUtcExclusive);
        }

        return $query;
    }
}
