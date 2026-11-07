<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\EncryptedClinicalList;
use App\Casts\EncryptedClinicalText;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property list<string>|null $substances the substances of the catalog product it was picked from (#377)
 * @property string $medication never null, which its encrypted cast (#391) can't tell Larastan
 * @property string $dosage never null, which its encrypted cast (#391) can't tell Larastan
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
            'medication' => EncryptedClinicalText::class,
            'presentation' => EncryptedClinicalText::class,
            'dosage' => EncryptedClinicalText::class,
            'gtin' => EncryptedClinicalText::class,
            'snomed' => EncryptedClinicalText::class,
            'position' => 'integer',
            'quantity' => 'integer',
            'substances' => EncryptedClinicalList::class,
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
