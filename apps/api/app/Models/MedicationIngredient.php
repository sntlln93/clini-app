<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One active pharmaceutical ingredient of a catalog product, as ANMAT lists it, with the substance it is (#377).
 */
#[WithoutTimestamps]
#[Fillable([
    'medication_product_id',
    'position',
    'name',
    'substance',
    'quantity',
    'unit',
    'as_name',
    'as_quantity',
    'as_unit',
])]
class MedicationIngredient extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'position' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<MedicationProduct, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(MedicationProduct::class, 'medication_product_id');
    }
}
