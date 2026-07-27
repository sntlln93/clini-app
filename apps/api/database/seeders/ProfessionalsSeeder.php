<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\MembershipRole;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use App\Models\ProfessionalSpecialty;
use App\Models\Service;
use App\Models\Specialty;
use App\Models\User;
use App\Models\UserSpecialty;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;

/**
 * Membership fixtures covering role variety, dev/test only. Idempotent for a
 * repeated migrate:fresh --seed: the user lookup is guarded via
 * firstOrCreateUser, and an early guard returns before touching memberships
 * (and everything derived from them) once the fixture memberships already
 * exist for the given organization, so a re-run creates no duplicate rows.
 */
class ProfessionalsSeeder extends Seeder
{
    public function run(Organization $organization): void
    {
        $prof1 = $this->firstOrCreateUser('prof1@test.com', 'Profesional Uno');
        $prof2 = $this->firstOrCreateUser('prof2@test.com', 'Profesional Dos');
        $owner = $this->firstOrCreateUser('owner@test.com', 'Dueño Uno');
        $staff = $this->firstOrCreateUser('staff@test.com', 'Staff Uno');
        $ownerStaff = $this->firstOrCreateUser('owner+staff@test.com', 'Dueño Staff');

        $fixtureUserIds = [$prof1->id, $prof2->id, $owner->id, $staff->id, $ownerStaff->id];

        $existingFixtureMemberships = Membership::where('organization_id', $organization->id)
            ->whereIn('user_id', $fixtureUserIds)
            ->count();

        if ($existingFixtureMemberships === count($fixtureUserIds)) {
            return;
        }

        $prof1Membership = Membership::factory()->professional()->create([
            'organization_id' => $organization->id,
            'user_id' => $prof1->id,
        ]);

        $prof2Membership = Membership::factory()->professional()->create([
            'organization_id' => $organization->id,
            'user_id' => $prof2->id,
        ]);

        Membership::factory()->owner()->create([
            'organization_id' => $organization->id,
            'user_id' => $owner->id,
        ]);

        Membership::factory()->staff()->create([
            'organization_id' => $organization->id,
            'user_id' => $staff->id,
        ]);

        Membership::factory()->withRoles(MembershipRole::Owner, MembershipRole::Staff)->create([
            'organization_id' => $organization->id,
            'user_id' => $ownerStaff->id,
        ]);

        $prof1Specialties = $this->attachCredentialSpecialties($prof1);
        $prof2Specialties = $this->attachCredentialSpecialties($prof2);

        foreach ($prof1Specialties as $specialty) {
            ProfessionalSpecialty::factory()->create([
                'organization_id' => $organization->id,
                'membership_id' => $prof1Membership->id,
                'specialty_id' => $specialty->id,
            ]);
        }

        foreach ($prof2Specialties as $specialty) {
            ProfessionalSpecialty::factory()->create([
                'organization_id' => $organization->id,
                'membership_id' => $prof2Membership->id,
                'specialty_id' => $specialty->id,
            ]);
        }

        $service = Service::inRandomOrder()->first();

        if ($service !== null) {
            ProfessionalService::factory()->create([
                'organization_id' => $organization->id,
                'membership_id' => $prof1Membership->id,
                'service_id' => $service->id,
            ]);
        }
    }

    /**
     * Mirrors `firstOrCreate` semantics for the user email, but goes through
     * `User::factory()->create()` on the miss so the password stays the
     * factory default instead of being set explicitly here.
     */
    private function firstOrCreateUser(string $email, string $name): User
    {
        $existing = User::where('email', $email)->first();

        if ($existing !== null) {
            return $existing;
        }

        return User::factory()->create([
            'name' => $name,
            'email' => $email,
        ]);
    }

    /**
     * @return Collection<int, Specialty>
     */
    private function attachCredentialSpecialties(User $user): Collection
    {
        $specialties = Specialty::inRandomOrder()->take(random_int(1, 2))->get();

        foreach ($specialties as $specialty) {
            UserSpecialty::factory()->create([
                'user_id' => $user->id,
                'specialty_id' => $specialty->id,
            ]);
        }

        return $specialties;
    }
}
