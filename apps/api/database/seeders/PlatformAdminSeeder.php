<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\PlatformAdmin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * The dashboard's seeded operator — never in production: the demo server
 * seeds a production image, and a publicly reachable dashboard with a known
 * password would be an open door. There, use `php artisan admin:create`.
 */
class PlatformAdminSeeder extends Seeder
{
    public const string EMAIL = 'operador@test.com';

    public function run(): void
    {
        if (app()->isProduction()) {
            return;
        }

        PlatformAdmin::query()->firstOrCreate(
            ['email' => self::EMAIL],
            ['name' => 'Olivia Operadora', 'password' => Hash::make('password')],
        );
    }
}
