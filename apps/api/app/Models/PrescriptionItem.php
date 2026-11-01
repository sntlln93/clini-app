<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property list<string>|null $substances the substances of the catalog product it was picked from (#377)
 */
#[Fillable([
    'prescription_version_id',
    'position',
    'medication',
    'presentation',
    'dosage',
    'quantity',
    'gtin',
    'snomed',
    'substances',
    'dispensing_condition',
    'control_mark',
    'composition_incomplete',
])]
class PrescriptionItem extends Model
{
    public const null UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'quantity' => 'integer',
            'substances' => 'array',
            'composition_incomplete' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<PrescriptionVersion, $this>
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(PrescriptionVersion::class, 'prescription_version_id');
    }
}
