<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Prescriptions\PrescriptionItemData;
use App\Models\MedicationIngredient;
use App\Models\MedicationProduct;

/**
 * What an item picked from the medication catalog keeps of its product (#377): its GTIN and the substances of its
 * active ingredients as the catalog holds them now, copied like an ICD-10 diagnosis (ADR 0020). A product whose detail
 * never arrived keeps its GTIN without substances.
 */
class MedicationSnapshot
{
    /**
     * @param  list<PrescriptionItemData>  $items
     * @return list<PrescriptionItemData>
     */
    public static function of(array $items): array
    {
        $gtins = array_values(array_filter(array_map(fn (PrescriptionItemData $item): ?string => $item->gtin, $items)));
        $products = $gtins === []
            ? collect()
            : MedicationProduct::query()->whereIn('gtin', $gtins)->with('ingredients')->get()->keyBy('gtin');

        return array_map(function (PrescriptionItemData $item) use ($products): PrescriptionItemData {
            /** @var MedicationProduct|null $product */
            $product = $item->gtin === null ? null : $products->get($item->gtin);

            return new PrescriptionItemData(
                medication: $item->medication,
                presentation: $item->presentation,
                dosage: $item->dosage,
                quantity: $item->quantity,
                gtin: $product?->gtin,
                substances: $product === null || $product->detail_fetched_at === null
                    ? null
                    : array_values(array_unique($product->ingredients->map(fn (MedicationIngredient $ingredient): string => $ingredient->substance)->all())),
            );
        }, $items);
    }
}
