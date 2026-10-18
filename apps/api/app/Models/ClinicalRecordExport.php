<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ClinicalRecordExportFormat;
use App\Enums\ClinicalRecordExportScope;
use App\Support\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The record of one export of the clinical history (#326, ADR 0021). Append-only like the history itself: a database
 * trigger rejects any UPDATE or DELETE of the row.
 */
#[Fillable(['organization_id', 'membership_id', 'patient_id', 'scope', 'format'])]
class ClinicalRecordExport extends Model
{
    use BelongsToOrganization;

    public const null UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scope' => ClinicalRecordExportScope::class,
            'format' => ClinicalRecordExportFormat::class,
        ];
    }

    /**
     * @return BelongsTo<Membership, $this>
     */
    public function exporter(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'membership_id')->withTrashed();
    }

    /**
     * @return BelongsTo<Patient, $this>
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
