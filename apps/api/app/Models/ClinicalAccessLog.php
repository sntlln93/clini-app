<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ClinicalAccessAction;
use App\Enums\ClinicalAccessReason;
use App\Support\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
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
])]
class ClinicalAccessLog extends Model
{
    use BelongsToOrganization;

    public const null UPDATED_AT = null;

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
}
