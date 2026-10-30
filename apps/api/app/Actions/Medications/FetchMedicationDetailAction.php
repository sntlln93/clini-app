<?php

declare(strict_types=1);

namespace App\Actions\Medications;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\MedicationSource;
use App\Data\Medications\MedicationDetailData;
use App\Data\Medications\MedicationLookupData;
use App\Exceptions\Medications\MedicationSourceUnavailableException;
use App\Models\MedicationProduct;
use App\Support\MedicationSubstance;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * A picked product's active ingredients (#377, ADR 0031), asked to the national vademecum once per product and kept:
 * its detail page reads the product from a search's session, so the lookup replays the search that listed it. Without
 * an answer the product stays without ingredients, and the next pick asks again.
 *
 * @implements Action<MedicationLookupData>
 */
class FetchMedicationDetailAction implements Action
{
    public function __construct(
        private readonly MedicationSource $source,
    ) {}

    /**
     * @param  MedicationLookupData  $dto
     */
    public function handle(Data $dto): MedicationProduct
    {
        $product = MedicationProduct::query()->findOrFail($dto->productId);

        if ($product->detail_fetched_at === null && $this->source->available()) {
            try {
                $detail = $this->source->detail($product->listed_by_field, $product->listed_by_term, $product->gtin);

                if ($detail !== null) {
                    $this->keep($product, $detail);
                }
            } catch (MedicationSourceUnavailableException $exception) {
                Log::warning($exception->getMessage(), $exception->logContext());
            }
        }

        return $product->load('ingredients');
    }

    private function keep(MedicationProduct $product, MedicationDetailData $detail): void
    {
        DB::transaction(function () use ($product, $detail): void {
            $product->ingredients()->delete();

            foreach ($detail->ingredients as $position => $ingredient) {
                $product->ingredients()->create([
                    'position' => $position,
                    'name' => $ingredient->name,
                    'substance' => MedicationSubstance::base($ingredient->name),
                    'quantity' => $ingredient->quantity,
                    'unit' => $ingredient->unit,
                    'as_name' => $ingredient->asName,
                    'as_quantity' => $ingredient->asQuantity,
                    'as_unit' => $ingredient->asUnit,
                ]);
            }

            $product->update([
                'administration_route' => $detail->administrationRoute,
                'dispensing_condition' => $detail->dispensingCondition,
                'troquel' => $detail->troquel,
                'detail_fetched_at' => now(),
            ]);
        });
    }
}
