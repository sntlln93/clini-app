<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One substance a catalog product's drug text names, as the source writes it and written out, as the panel shows it
 * and the allergy warning compares it (#377, `MedicationComposition`). A piece naming several vitamins is one row each.
 */
#[WithoutTimestamps]
#[Fillable(['medication_product_id', 'position', 'name', 'substance'])]
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
