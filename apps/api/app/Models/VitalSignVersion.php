<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The values of one measurement: version 1 is what was recorded first, and every amendment adds the next one.
 */
#[Fillable([
    'vital_sign_id',
    'version',
    'membership_id',
    'reason',
    'weight_kg',
    'height_cm',
    'head_circumference_cm',
    'waist_circumference_cm',
    'systolic_mmhg',
    'diastolic_mmhg',
    'capillary_glucose_mg_dl',
    'heart_rate_bpm',
    'respiratory_rate_rpm',
    'temperature_c',
    'oxygen_saturation_pct',
])]
class VitalSignVersion extends Model
{
    public const null UPDATED_AT = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'weight_kg' => 'float',
            'height_cm' => 'float',
            'head_circumference_cm' => 'float',
            'waist_circumference_cm' => 'float',
            'systolic_mmhg' => 'integer',
            'diastolic_mmhg' => 'integer',
            'capillary_glucose_mg_dl' => 'integer',
            'heart_rate_bpm' => 'integer',
            'respiratory_rate_rpm' => 'integer',
            'temperature_c' => 'float',
            'oxygen_saturation_pct' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<VitalSign, $this>
     */
    public function vitalSign(): BelongsTo
    {
        return $this->belongsTo(VitalSign::class);
    }

    /**
     * Deactivating a membership soft-deletes it, and the record keeps its author.
     *
     * @return BelongsTo<Membership, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(Membership::class, 'membership_id')->withTrashed();
    }
}
