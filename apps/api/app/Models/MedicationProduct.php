<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\MedicationSearchField;
use App\Support\FoldedText;
use Database\Factories\MedicationProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One product of the medication catalog (#377, ADR 0031): global reference data that only the national vademecum's
 * adapter writes, never a CRUD. Its active ingredients arrive with its detail (`detail_fetched_at`).
 */
#[Fillable([
    'gtin',
    'certificate_number',
    'laboratory',
    'commercial_name',
    'pharmaceutical_form',
    'presentation',
    'generic_name',
    'administration_route',
    'dispensing_condition',
    'troquel',
    'listed_by_field',
    'listed_by_term',
    'detail_fetched_at',
])]
class MedicationProduct extends Model
{
    /** @use HasFactory<MedicationProductFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'listed_by_field' => MedicationSearchField::class,
            'detail_fetched_at' => 'immutable_datetime',
        ];
    }

    /**
     * @return HasMany<MedicationIngredient, $this>
     */
    public function ingredients(): HasMany
    {
        return $this->hasMany(MedicationIngredient::class)->orderBy('position');
    }

    /**
     * Products whose commercial or generic name contains the term, ignoring case and accents; the ones whose
     * commercial name starts with it come first.
     *
     * @param  Builder<MedicationProduct>  $query
     * @return Builder<MedicationProduct>
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        $folded = addcslashes(FoldedText::fold($term), '\\%_');
        $accented = implode('', array_keys(FoldedText::UNACCENTED));
        $unaccented = implode('', FoldedText::UNACCENTED);
        $commercial = 'translate(lower(commercial_name), ?, ?)';

        return $query
            ->where(function (Builder $query) use ($folded, $accented, $unaccented, $commercial) {
                $query->whereRaw("{$commercial} like ?", [$accented, $unaccented, "%{$folded}%"])
                    ->orWhereRaw('translate(lower(generic_name), ?, ?) like ?', [$accented, $unaccented, "%{$folded}%"]);
            })
            ->orderByRaw("CASE WHEN {$commercial} like ? THEN 0 ELSE 1 END", [$accented, $unaccented, "{$folded}%"])
            ->orderBy('commercial_name')
            ->orderBy('gtin');
    }
}
