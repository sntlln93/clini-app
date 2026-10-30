<?php

declare(strict_types=1);

namespace App\Http\Resources\Medications;

use App\Models\MedicationIngredient;
use App\Models\MedicationProduct;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One product of the medication catalog (#377). `ingredients` is null until its detail was fetched, which is not the
 * same as a product without active ingredients.
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
            'commercial_name' => $product->commercial_name,
            'pharmaceutical_form' => $product->pharmaceutical_form,
            'presentation' => $product->presentation,
            'generic_name' => $product->generic_name,
            'laboratory' => $product->laboratory,
            'certificate_number' => $product->certificate_number,
            'ingredients' => $product->detail_fetched_at === null || ! $product->relationLoaded('ingredients')
                ? null
                : $product->ingredients->map(fn (MedicationIngredient $ingredient): array => [
                    'name' => $ingredient->name,
                    'substance' => $ingredient->substance,
                    'quantity' => $ingredient->quantity,
                    'unit' => $ingredient->unit,
                ])->values()->all(),
        ];
    }

    private function product(): MedicationProduct
    {
        /** @var MedicationProduct $product */
        $product = $this->resource;

        return $product;
    }
}
