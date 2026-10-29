<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ClinicalAccessAction;
use App\Enums\ClinicalAccessReason;
use App\Support\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row of the clinical access log (#325, ADR 0022). Append-only like the history it records: a database trigger
 * rejects any UPDATE or DELETE of the row.
 */
#[Fillable([
    'organization_id',
    'membership_id',
    'patient_id',
    'action',
    'appointment_id',
    'clinical_note_id',
    'prescription_id',
    'reason',
    'reason_detail',
    'clinical_record_export_id',
])]
class ClinicalAccessLog extends Model
{
    use BelongsToOrganization;

    public const null UPDATED_AT = null;

    /**
     * What a trail entry shows besides its own columns (`ClinicalAccessTrailEntryResource`).
     */
    public const array TRAIL_RELATIONS = ['accessor.user', 'appointment', 'export'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'action' => ClinicalAccessAction::class,
            'reason' => ClinicalAccessReason::class,
        ];
    }

    /**
     * Deactivating a membership soft-deletes it, and the log keeps who accessed.
     *
     * @return BelongsTo<Membership, $this>
     */
    public function accessor(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'membership_id')->withTrashed();
    }

    /**
     * @return BelongsTo<Patient, $this>
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class)->withTrashed();
    }

    /**
     * @return BelongsTo<Appointment, $this>
     */
    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class)->withTrashed();
    }

    /**
     * @return BelongsTo<ClinicalRecordExport, $this>
     */
    public function export(): BelongsTo
    {
        return $this->belongsTo(ClinicalRecordExport::class, 'clinical_record_export_id');
    }

    /**
     * A patient's trail as a member of the practice sees it: every row on that patient in the practice, the medication
     * other professionals indicated included, since it is part of the history the reader already reads (#359).
     *
     * @param  Builder<ClinicalAccessLog>  $query
     * @return Builder<ClinicalAccessLog>
     */
    public function scopeVisibleTo(Builder $query, int $organizationId): Builder
    {
        return $query->where('organization_id', $organizationId);
    }
}
