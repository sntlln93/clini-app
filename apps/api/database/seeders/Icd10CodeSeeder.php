<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Icd10Code;
use Illuminate\Database\Seeder;

/**
 * A handful of common ICD-10 codes, dev/test only. In production the
 * catalog is owned and loaded by the external catalog app (ADR 0020), like
 * specialties. Idempotent via updateOrCreate on the code.
 */
class Icd10CodeSeeder extends Seeder
{
    public function run(): void
    {
        $codes = [
            'A09' => 'Diarrea y gastroenteritis de presunto origen infeccioso',
            'E11.9' => 'Diabetes mellitus no insulinodependiente, sin mención de complicación',
            'E66.9' => 'Obesidad, no especificada',
            'F32.9' => 'Episodio depresivo, no especificado',
            'F41.1' => 'Trastorno de ansiedad generalizada',
            'I10' => 'Hipertensión esencial (primaria)',
            'J02.9' => 'Faringitis aguda, no especificada',
            'J06.9' => 'Infección aguda de las vías respiratorias superiores, no especificada',
            'J45.9' => 'Asma, no especificada',
            'K02.9' => 'Caries dental, no especificada',
            'K29.7' => 'Gastritis, no especificada',
            'L20.9' => 'Dermatitis atópica, no especificada',
            'M54.5' => 'Lumbago no especificado',
            'N39.0' => 'Infección de vías urinarias, sitio no especificado',
            'R51' => 'Cefalea',
            'Z00.0' => 'Examen médico general',
        ];

        foreach ($codes as $code => $description) {
            Icd10Code::updateOrCreate(['code' => $code], ['description' => $description]);
        }
    }
}
