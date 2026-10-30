<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\MedicationSearchField;
use App\Models\MedicationProduct;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MedicationProduct>
 */
class MedicationProductFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'gtin' => fake()->unique()->numerify('0779##########'),
            'certificate_number' => fake()->numerify('#####'),
            'laboratory' => 'LABORATORIO DE PRUEBA S A',
            'commercial_name' => 'IBUPIRAC 400',
            'pharmaceutical_form' => 'COMPRIMIDO RECUBIERTO',
            'presentation' => 'BLISTER por 20 UNIDADES',
            'generic_name' => 'IBUPROFENO 400 MG',
            'listed_by_field' => MedicationSearchField::Commercial,
            'listed_by_term' => 'ibupirac',
        ];
    }

    /**
     * Its detail already fetched, with these ingredients (name => substance).
     *
     * @param  array<string, string>  $ingredients
     */
    public function withIngredients(array $ingredients): static
    {
        return $this->state(['detail_fetched_at' => now()])->afterCreating(function (MedicationProduct $product) use ($ingredients): void {
            $position = 0;

            foreach ($ingredients as $name => $substance) {
                $product->ingredients()->create(['position' => $position++, 'name' => $name, 'substance' => $substance]);
            }
        });
    }
}
