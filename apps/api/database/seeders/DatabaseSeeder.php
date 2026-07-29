<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Organization;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;

/**
 * Fully literal, deterministic fixture set — no factories, no faker — so it
 * runs on the production image (composer install --no-dev) and can be
 * re-run safely (php artisan db:seed) without duplicating rows. See
 * docs/architecture/development.md for the seeded credentials and how to
 * seed a deployed environment.
 *
 * WithoutModelEvents is kept even though none of the seeded models
 * currently observe events: Model::withoutEvents() wraps this run() call
 * for its whole synchronous call stack (including every nested
 * $this->call()), so it stays a cheap, forward-looking safety net rather
 * than dead weight.
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call(OrganizationsSeeder::class);
        $this->call(InsuranceProviderSeeder::class);
        $this->call(CatalogSeeder::class);

        foreach ($this->fixtureOrganizations() as $organization) {
            $this->callWith(ProfessionalsSeeder::class, ['organization' => $organization]);
            $this->callWith(PatientsSeeder::class, ['organization' => $organization]);
            $this->callWith(SchedulingSeeder::class, ['organization' => $organization]);
        }
    }

    /**
     * The two organizations OrganizationsSeeder just created/found, looked
     * up by slug rather than threading a return value through
     * $this->call() (Illuminate\Database\Seeder::call() returns $this, not
     * run()'s result).
     *
     * @return Collection<int, Organization>
     */
    private function fixtureOrganizations(): Collection
    {
        return Organization::whereIn('slug', [
            OrganizationsSeeder::ORGANIZATION_A_SLUG,
            OrganizationsSeeder::ORGANIZATION_B_SLUG,
        ])->orderBy('id')->get();
    }
}
