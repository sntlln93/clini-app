<?php

declare(strict_types=1);

namespace App\Http\Resources\Medications;

use App\Models\MedicationIngredient;
use App\Models\MedicationProduct;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One product of the medication catalog (#377), everything the form needs to fill an item from it: picking it asks
 * nothing else. `substances` are the substances its drug text names, written out, which the allergy warning compares;
 * `composition_incomplete` says the source cut that list short.
 *
 * @mixin MedicationProduct
 */
class MedicationProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $product = $this->product();

        return [
            'gtin' => $product->gtin,
            'name' => $product->name,
            'presentation' => $product->presentation,
            'pharmaceutical_form' => $product->pharmaceutical_form,
            'administration_route' => $product->administration_route,
            'laboratory' => $product->laboratory,
            'drug' => $product->drug,
            'therapeutic_action' => $product->therapeutic_action,
            'dispensing_condition' => $product->dispensing_condition,
            'control_mark' => $product->control_mark,
            'substances' => $product->ingredients
                ->map(fn (MedicationIngredient $ingredient): string => $ingredient->substance)
                ->unique()
                ->values()
                ->all(),
            'composition_incomplete' => $product->composition_incomplete,
        ];
    }

    private function product(): MedicationProduct
    {
        /** @var MedicationProduct $product */
        $product = $this->resource;

        return $product;
    }
}
