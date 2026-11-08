<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

/**
 * Global services catalog, dev/test only. In production this catalog is
 * owned and populated by an external management app; this seeder is
 * idempotent via firstOrCreate so a repeated migrate:fresh --seed never
 * duplicates rows. Specialties come from the registry instead
 * (ProfessionalRegistrySeeder, #387).
 */
class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $services = [
            'Consulta',
            'Control',
            'Primera consulta',
            'Sesión de terapia',
            'Limpieza dental',
            'Estudio diagnóstico',
        ];

        foreach ($services as $name) {
            Service::firstOrCreate(['name' => $name]);
        }
    }
}
