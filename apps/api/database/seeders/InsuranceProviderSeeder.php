<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\InsuranceProvider;
use Illuminate\Database\Seeder;

/**
 * Real Argentine obras sociales, dev/test only. Idempotent via
 * firstOrCreate so a repeated migrate:fresh --seed never duplicates rows.
 */
class InsuranceProviderSeeder extends Seeder
{
    public function run(): void
    {
        $names = [
            'OSDE',
            'Swiss Medical',
            'Galeno',
            'Medifé',
            'OMINT',
            'IOMA',
            'PAMI',
            'Particular',
        ];

        foreach ($names as $name) {
            InsuranceProvider::firstOrCreate(['name' => $name]);
        }
    }
}
