<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Two fixture organizations with literal, deterministic users and
 * memberships, covering every App\Enums\MembershipRole case, every
 * App\Enums\MembershipStatus case, a multi-role membership and a user with
 * a membership in both organizations. Idempotent via firstOrCreate on
 * organizations.slug, users.email and the (organization_id, user_id)
 * natural key on memberships, so a repeated `php artisan db:seed` never
 * duplicates rows. See docs/architecture/development.md for the full
 * credentials table.
 */
class OrganizationsSeeder extends Seeder
{
    public const string ORGANIZATION_A_SLUG = 'clinica-modelo';

    public const string ORGANIZATION_B_SLUG = 'consultorio-dos';

    /**
     * The single literal password shared by every seeded user. No env
     * override — see docs/architecture/development.md.
     */
    private const string SEEDED_PASSWORD = 'password';

    public function run(): void
    {
        $organizationA = Organization::firstOrCreate(
            ['slug' => self::ORGANIZATION_A_SLUG],
            ['name' => 'Clínica Modelo', 'timezone' => 'America/Argentina/Buenos_Aires'],
        );

        $organizationB = Organization::firstOrCreate(
            ['slug' => self::ORGANIZATION_B_SLUG],
            ['name' => 'Consultorio Dos', 'timezone' => 'America/Argentina/Cordoba'],
        );

        // Shared across both organizations: the "one user with a
        // membership in both orgs" fixture case.
        $sharedProfessional = $this->firstOrCreateUser('carla.profesional@test.com', 'Carla Profesional');

        $this->seedMembership($organizationA, $this->firstOrCreateUser('ana.duena@test.com', 'Ana Dueña'), [MembershipRole::Owner], MembershipStatus::Active);
        $this->seedMembership($organizationA, $this->firstOrCreateUser('bruno.admin@test.com', 'Bruno Admin'), [MembershipRole::Admin], MembershipStatus::Active);
        $this->seedMembership($organizationA, $sharedProfessional, [MembershipRole::Professional], MembershipStatus::Active);
        $this->seedMembership($organizationA, $this->firstOrCreateUser('diego.profesional@test.com', 'Diego Profesional'), [MembershipRole::Professional], MembershipStatus::Inactive);
        $this->seedMembership($organizationA, $this->firstOrCreateUser('elena.staff@test.com', 'Elena Staff'), [MembershipRole::Staff], MembershipStatus::Active);
        // Multi-role membership fixture case (replaces the old withRoles(Owner, Staff) factory state).
        $this->seedMembership($organizationA, $this->firstOrCreateUser('fabian.duenostaff@test.com', 'Fabián Dueño Staff'), [MembershipRole::Owner, MembershipRole::Staff], MembershipStatus::Active);

        $this->seedMembership($organizationB, $this->firstOrCreateUser('gabriela.duena@test.com', 'Gabriela Dueña'), [MembershipRole::Owner], MembershipStatus::Active);
        $this->seedMembership($organizationB, $this->firstOrCreateUser('hernan.admin@test.com', 'Hernán Admin'), [MembershipRole::Admin], MembershipStatus::Suspended);
        $this->seedMembership($organizationB, $sharedProfessional, [MembershipRole::Professional], MembershipStatus::Active);
        $this->seedMembership($organizationB, $this->firstOrCreateUser('julian.staff@test.com', 'Julián Staff'), [MembershipRole::Staff], MembershipStatus::Active);
    }

    private function firstOrCreateUser(string $email, string $name): User
    {
        return User::firstOrCreate(
            ['email' => $email],
            ['name' => $name, 'password' => Hash::make(self::SEEDED_PASSWORD)],
        );
    }

    /**
     * @param  array<int, MembershipRole>  $roles
     */
    private function seedMembership(Organization $organization, User $user, array $roles, MembershipStatus $status): Membership
    {
        return Membership::firstOrCreate(
            ['organization_id' => $organization->id, 'user_id' => $user->id],
            ['roles' => $roles, 'status' => $status],
        );
    }
}
