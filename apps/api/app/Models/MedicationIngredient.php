<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\FoldedText;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\WithoutTimestamps;
use Illuminate\Database\Eloquent\Builder;
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

    /**
     * The substances of suggestible products (`MedicationProduct::suggestible()`) that contain the term, ignoring case
     * and accents, one row per substance as it folds, those that start with the term first (#383). Aggregates only after
     * the grouping: Postgres tells apart two expressions with their own bindings. Of two spellings
     * that fold alike the one sorting last is kept, usually the accented one: the allergy warning folds both alike.
     *
     * @param  Builder<MedicationIngredient>  $query
     * @return Builder<MedicationIngredient>
     */
    public function scopeSuggestedSubstances(Builder $query, string $term): Builder
    {
        $folded = addcslashes(FoldedText::fold($term), '\\%_');
        $substance = FoldedText::sql('substance');

        return $query
            ->selectRaw('max(substance) as substance')
            ->whereIn('medication_product_id', MedicationProduct::query()->suggestible()->select('id'))
            ->whereRaw("{$substance} like ?", [...FoldedText::sqlBindings(), "%{$folded}%"])
            ->groupByRaw($substance, FoldedText::sqlBindings())
            ->orderByRaw("min(CASE WHEN {$substance} like ? THEN 0 ELSE 1 END)", [...FoldedText::sqlBindings(), "{$folded}%"])
            ->orderByRaw('max(substance)');
    }
}
