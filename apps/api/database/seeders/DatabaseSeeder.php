<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $organization = Organization::factory()->create([
            'name' => 'Test Organization',
        ]);

        Membership::factory()->owner()->create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
        ]);

        $this->call(InsuranceProviderSeeder::class);
        $this->call(CatalogSeeder::class);
        $this->callWith(ProfessionalsSeeder::class, ['organization' => $organization]);
        $this->callWith(PatientsSeeder::class, ['organization' => $organization]);
    }
}
