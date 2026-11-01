<?php

declare(strict_types=1);

namespace Database\Factories;

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
            'name' => 'IBUPIRAC 400',
            'presentation' => 'comp.x 20',
            'pharmaceutical_form' => 'Comprimidos/Pastillas/Tabletas/Grageas',
            'administration_route' => 'oral',
            'laboratory' => 'Laboratorio de prueba',
            'troquel' => fake()->numerify('#######'),
            'snomed' => fake()->numerify('###############'),
            'drug' => 'ibuprofeno',
            'drug_code' => '00123',
            'therapeutic_action' => 'Analgésico Antiinflam.',
            'therapeutic_action_code' => '00010',
            'dispensing_condition' => 'Venta Libre',
            'control_mark' => null,
            'withdrawn' => false,
            'in_force' => true,
            'source_updated_on' => '2026-10-27',
            'composition_incomplete' => false,
        ];
    }

    /**
     * With these substances (name as the source writes it => substance written out).
     *
     * @param  array<string, string>  $ingredients
     */
    public function withIngredients(array $ingredients): static
    {
        return $this->afterCreating(function (MedicationProduct $product) use ($ingredients): void {
            $position = 0;

            foreach ($ingredients as $name => $substance) {
                $product->ingredients()->create(['position' => $position++, 'name' => $name, 'substance' => $substance]);
            }
        });
    }
}
