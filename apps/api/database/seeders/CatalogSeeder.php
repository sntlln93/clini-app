<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Service;
use App\Models\Specialty;
use Illuminate\Database\Seeder;

/**
 * Global specialties/services catalog, dev/test only. In production this
 * catalog is owned and populated by an external management app; this
 * seeder is idempotent via firstOrCreate so a repeated migrate:fresh
 * --seed never duplicates rows.
 */
class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $specialties = [
            'Medicina General',
            'Pediatría',
            'Cardiología',
            'Dermatología',
            'Ginecología',
            'Traumatología',
            'Psicología',
            'Nutrición',
            'Odontología',
            'Kinesiología',
        ];

        foreach ($specialties as $name) {
            Specialty::firstOrCreate(['name' => $name]);
        }

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
