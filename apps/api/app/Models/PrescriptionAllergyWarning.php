<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A current allergy that matched a version of indicated medication, which its professional indicated anyway (#362,
 * ADR 0030): the allergy version that matched, and whether the warning showed its detail.
 */
#[Fillable([
    'prescription_version_id',
    'clinical_access_log_id',
    'medical_history_entry_id',
    'medical_history_entry_version_id',
    'detail_shown',
])]
class PrescriptionAllergyWarning extends Model
{
    public const null UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'detail_shown' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<PrescriptionVersion, $this>
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(PrescriptionVersion::class, 'prescription_version_id');
    }

    /**
     * The access log row of the confirmation.
     *
     * @return BelongsTo<ClinicalAccessLog, $this>
     */
    public function accessLog(): BelongsTo
    {
        return $this->belongsTo(ClinicalAccessLog::class, 'clinical_access_log_id');
    }

    /**
     * @return BelongsTo<MedicalHistoryEntry, $this>
     */
    public function entry(): BelongsTo
    {
        return $this->belongsTo(MedicalHistoryEntry::class, 'medical_history_entry_id');
    }
}
