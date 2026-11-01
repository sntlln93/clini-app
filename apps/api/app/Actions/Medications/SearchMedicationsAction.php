<?php

declare(strict_types=1);

namespace App\Actions\Medications;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\MedicationSource;
use App\Data\Medications\MedicationIngredientData;
use App\Data\Medications\MedicationProductData;
use App\Data\Medications\MedicationSearchData;
use App\Exceptions\Medications\MedicationSourceUnavailableException;
use App\Models\MedicationIngredient;
use App\Models\MedicationProduct;
use App\Models\MedicationSearch;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * The medication catalog answers from what it holds (#377, ADR 0031). A term no recent search covers is asked to the
 * medication source first, and everything it answers is kept, non-drugs and withdrawn products too: keeping only part
 * of an answer would make the coverage rule answer later searches with less. If the source fails the catalog answers
 * with what it holds, and the field stays free text.
 *
 * @implements Action<MedicationSearchData>
 */
class SearchMedicationsAction implements Action
{
    public const int RESULTS_LIMIT = 10;

    public function __construct(
        private readonly MedicationSource $source,
    ) {}

    /**
     * @param  MedicationSearchData  $dto
     * @return Collection<int, MedicationProduct>
     */
    public function handle(Data $dto): Collection
    {
        $key = MedicationSearch::key($dto->term);

        if (! MedicationSearch::query()->covering($key)->exists() && $this->source->available()) {
            $this->askSource($key);
        }

        return MedicationProduct::query()
            ->suggestible()
            ->search($dto->term)
            ->with('ingredients')
            ->limit(self::RESULTS_LIMIT)
            ->get();
    }

    /**
     * The source is asked for the very key its answer is recorded under, so what the record covers is what was asked.
     */
    private function askSource(string $key): void
    {
        try {
            $products = $this->source->search($key);
        } catch (MedicationSourceUnavailableException $exception) {
            Log::warning($exception->getMessage(), $exception->logContext());

            return;
        }

        DB::transaction(function () use ($products, $key): void {
            $this->keep($products);

            MedicationSearch::query()->upsert([['term' => $key, 'searched_at' => now()->utc()]], ['term'], ['searched_at']);
        });
    }

    /**
     * Upserted in GTIN order, so two searches keeping the same products lock them in the same order and the second
     * waits for the first instead of interleaving their substances.
     *
     * @param  list<MedicationProductData>  $products
     */
    private function keep(array $products): void
    {
        $byGtin = [];

        foreach ($products as $product) {
            $byGtin[$product->gtin] = $product;
        }

        ksort($byGtin, SORT_STRING);

        foreach (array_chunk($byGtin, 500, true) as $chunk) {
            MedicationProduct::query()->upsert(
                array_values(array_map(fn (MedicationProductData $product): array => self::columns($product), $chunk)),
                ['gtin'],
                array_keys(self::columns(reset($chunk))),
            );

            // A GTIN-14 that doesn't start with 0 becomes an integer key.
            $ids = MedicationProduct::query()->whereIn('gtin', array_map(strval(...), array_keys($chunk)))->pluck('id', 'gtin');
            MedicationIngredient::query()->whereIn('medication_product_id', $ids->values())->delete();

            $ingredients = [];

            foreach ($chunk as $gtin => $product) {
                foreach ($product->composition->ingredients as $position => $ingredient) {
                    $ingredients[] = ['medication_product_id' => $ids[$gtin], 'position' => $position, ...self::ingredient($ingredient)];
                }
            }

            foreach (array_chunk($ingredients, 1000) as $rows) {
                MedicationIngredient::query()->insert($rows);
            }
        }
    }

    /**
     * @return array<string, string|bool|null>
     */
    private static function columns(MedicationProductData $product): array
    {
        return [
            'gtin' => $product->gtin,
            'name' => $product->name,
            'presentation' => $product->presentation,
            'pharmaceutical_form' => $product->pharmaceuticalForm,
            'administration_route' => $product->administrationRoute,
            'laboratory' => $product->laboratory,
            'troquel' => $product->troquel,
            'snomed' => $product->snomed,
            'drug' => $product->drug,
            'drug_code' => $product->drugCode,
            'therapeutic_action' => $product->therapeuticAction,
            'therapeutic_action_code' => $product->therapeuticActionCode,
            'dispensing_condition' => $product->dispensingCondition,
            'control_mark' => $product->controlMark,
            'withdrawn' => $product->withdrawn,
            'in_force' => $product->inForce,
            'source_updated_on' => $product->updatedOn,
            'composition_incomplete' => $product->composition->incomplete,
        ];
    }

    /**
     * @return array{name: string, substance: string}
     */
    private static function ingredient(MedicationIngredientData $ingredient): array
    {
        return ['name' => $ingredient->name, 'substance' => $ingredient->substance];
    }
}
