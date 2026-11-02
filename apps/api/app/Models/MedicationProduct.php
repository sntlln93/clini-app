<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\FoldedText;
use Database\Factories\MedicationProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One product of the medication catalog (#377, ADR 0031): global reference data that only the medication source's
 * answers write, never a CRUD. It keeps every product the source lists, non-drugs and withdrawn ones too, so a term's
 * coverage stays exact; only `suggestible()` ones are offered.
 */
#[Fillable([
    'gtin',
    'name',
    'presentation',
    'pharmaceutical_form',
    'administration_route',
    'laboratory',
    'troquel',
    'snomed',
    'drug',
    'drug_code',
    'therapeutic_action',
    'therapeutic_action_code',
    'dispensing_condition',
    'control_mark',
    'withdrawn',
    'in_force',
    'source_updated_on',
    'composition_incomplete',
])]
class MedicationProduct extends Model
{
    /** @use HasFactory<MedicationProductFactory> */
    use HasFactory;

    /**
     * What marks a product as not a drug, by column, as the source writes it (compared folded): accessories, devices,
     * cosmetics, supplements and foods. The catalog keeps them, but never suggests them when indicating medication.
     */
    public const array NON_DRUG_MARKERS = [
        'drug' => ['accesorio', 'medidor de glucosa', 'producto cosmético', 'tiras reactivas'],
        'therapeutic_action' => [
            'Accesorios',
            'Alimentos propós.médico específ.',
            'Control glucosa',
            'Dermatocosméticos',
            'Nutrición enteral',
            'Productos odontológicos',
            'Productos para contactología',
            'Protector solar',
            'Suplemento dietario',
            'Suplemento nutricional',
            'Test de embarazo',
        ],
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'withdrawn' => 'boolean',
            'in_force' => 'boolean',
            'source_updated_on' => 'immutable_date',
            'composition_incomplete' => 'boolean',
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
     * Products whose name or drug text contains the term, ignoring case and accents: the fields the source matches
     * too, so the catalog never answers a covered term with less than the source would. The ones whose name starts
     * with it come first.
     *
     * @param  Builder<MedicationProduct>  $query
     * @return Builder<MedicationProduct>
     */
    public function scopeSearch(Builder $query, string $term): Builder
    {
        $folded = addcslashes(FoldedText::fold($term), '\\%_');
        $name = FoldedText::sql('name');

        return $query
            ->where(fn (Builder $query) => $query
                ->whereRaw("{$name} like ?", [...FoldedText::sqlBindings(), "%{$folded}%"])
                ->orWhereRaw(FoldedText::sql('drug').' like ?', [...FoldedText::sqlBindings(), "%{$folded}%"]))
            ->orderByRaw("CASE WHEN {$name} like ? THEN 0 ELSE 1 END", [...FoldedText::sqlBindings(), "{$folded}%"])
            ->orderBy('name')
            ->orderBy('presentation')
            ->orderBy('gtin');
    }

    /**
     * Drugs still on the market: neither withdrawn nor marked as a non-drug (`NON_DRUG_MARKERS`).
     *
     * @param  Builder<MedicationProduct>  $query
     * @return Builder<MedicationProduct>
     */
    public function scopeSuggestible(Builder $query): Builder
    {
        $query->where('withdrawn', false);

        foreach (self::NON_DRUG_MARKERS as $column => $markers) {
            foreach ($markers as $marker) {
                $query->whereRaw(FoldedText::sql("coalesce({$column}, '')").' <> ?', [...FoldedText::sqlBindings(), FoldedText::fold($marker)]);
            }
        }

        return $query;
    }
}
