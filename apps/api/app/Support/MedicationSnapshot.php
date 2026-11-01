<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Prescriptions\PrescriptionItemData;
use App\Models\MedicationIngredient;
use App\Models\MedicationProduct;
use App\Models\PrescriptionItem;

/**
 * What an item picked from the medication catalog keeps of its product (#377): its GTIN, its SNOMED code, the
 * substances its drug text names (and whether the source cut that text short), its dispensing condition and its
 * control mark, as the catalog holds them now, copied like an ICD-10 diagnosis (ADR 0020). The request only names the
 * product by GTIN; everything else comes from here. An amendment that keeps a product keeps the copy the amended
 * version holds, never the catalog's current one, like a kept diagnosis. Marked products are kept, not blocked: the circuit a controlled prescription needs belongs to the
 * prescription (#314).
 */
class MedicationSnapshot
{
    /**
     * @param  list<PrescriptionItemData>  $items
     * @param  iterable<PrescriptionItem>  $kept  the items of the version an amendment follows
     * @return list<PrescriptionItemData>
     */
    public static function of(array $items, iterable $kept = []): array
    {
        /** @var array<string, PrescriptionItem> $previous */
        $previous = [];

        foreach ($kept as $item) {
            if ($item->gtin !== null) {
                $previous[$item->gtin] ??= $item;
            }
        }

        $gtins = array_values(array_filter(
            array_map(fn (PrescriptionItemData $item): ?string => $item->gtin, $items),
            fn (?string $gtin): bool => $gtin !== null && ! isset($previous[$gtin]),
        ));
        $products = $gtins === []
            ? collect()
            : MedicationProduct::query()->whereIn('gtin', $gtins)->with('ingredients')->get()->keyBy('gtin');

        return array_map(function (PrescriptionItemData $item) use ($previous, $products): PrescriptionItemData {
            $copy = $item->gtin === null ? null : ($previous[$item->gtin] ?? null);

            if ($copy !== null) {
                return new PrescriptionItemData(
                    medication: $item->medication,
                    presentation: $item->presentation,
                    dosage: $item->dosage,
                    quantity: $item->quantity,
                    gtin: $copy->gtin,
                    snomed: $copy->snomed,
                    substances: $copy->substances,
                    dispensingCondition: $copy->dispensing_condition,
                    controlMark: $copy->control_mark,
                    compositionIncomplete: $copy->composition_incomplete,
                );
            }

            /** @var MedicationProduct|null $product */
            $product = $item->gtin === null ? null : $products->get($item->gtin);

            return new PrescriptionItemData(
                medication: $item->medication,
                presentation: $item->presentation,
                dosage: $item->dosage,
                quantity: $item->quantity,
                gtin: $product?->gtin,
                snomed: $product?->snomed,
                substances: $product === null
                    ? null
                    : array_values(array_unique($product->ingredients->map(fn (MedicationIngredient $ingredient): string => $ingredient->substance)->all())),
                dispensingCondition: $product?->dispensing_condition,
                controlMark: $product?->control_mark,
                compositionIncomplete: $product?->composition_incomplete,
            );
        }, $items);
    }
}
