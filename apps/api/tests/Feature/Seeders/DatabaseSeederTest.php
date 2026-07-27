<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Organization;
use App\Models\ProfessionalService;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use App\Models\User;
use App\Models\UserSpecialty;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\ProfessionalsSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

test('Test User ends up with exactly one active membership in exactly one organization', function () {
    $this->seed(DatabaseSeeder::class);

    $user = User::where('email', 'test@example.com')->firstOrFail();

    $memberships = $user->memberships;

    expect($memberships)->toHaveCount(1);
    expect($memberships->pluck('organization_id')->unique())->toHaveCount(1);
    expect($memberships->first()->status)->toBe(MembershipStatus::Active);
});

test('an authenticated Test User can list patients instead of getting a 403 from the organization middleware', function () {
    $this->seed(DatabaseSeeder::class);

    $user = User::where('email', 'test@example.com')->firstOrFail();

    $response = $this->actingAs($user)->getJson('/api/v1/patients');

    $response->assertOk();
});

test('DatabaseSeeder creates the five fixture users with exactly one active membership each in Test Organization', function () {
    $this->seed(DatabaseSeeder::class);

    $organization = Organization::where('name', 'Test Organization')->firstOrFail();

    $emails = [
        'prof1@test.com',
        'prof2@test.com',
        'owner@test.com',
        'staff@test.com',
        'owner+staff@test.com',
    ];

    foreach ($emails as $email) {
        $user = User::where('email', $email)->firstOrFail();

        $memberships = $user->memberships;

        expect($memberships)->toHaveCount(1);
        expect($memberships->first()->organization_id)->toBe($organization->id);
        expect($memberships->first()->status)->toBe(MembershipStatus::Active);
    }
});

test('the fixture memberships carry the expected roles', function () {
    $this->seed(DatabaseSeeder::class);

    $expectedRoles = [
        'prof1@test.com' => [MembershipRole::Professional],
        'prof2@test.com' => [MembershipRole::Professional],
        'owner@test.com' => [MembershipRole::Owner],
        'staff@test.com' => [MembershipRole::Staff],
        'owner+staff@test.com' => [MembershipRole::Owner, MembershipRole::Staff],
    ];

    foreach ($expectedRoles as $email => $roles) {
        $user = User::where('email', $email)->firstOrFail();

        expect($user->memberships->first()->roles)->toBe($roles);
    }
});

test('every fixture user shares the dev password', function () {
    $this->seed(DatabaseSeeder::class);

    $emails = [
        'prof1@test.com',
        'prof2@test.com',
        'owner@test.com',
        'staff@test.com',
        'owner+staff@test.com',
    ];

    foreach ($emails as $email) {
        $user = User::where('email', $email)->firstOrFail();

        expect(Hash::check('password', $user->password))->toBeTrue();
    }
});

test('prof1 and prof2 each get between one and two catalog-backed user_specialties', function () {
    $this->seed(DatabaseSeeder::class);

    $catalogSpecialtyIds = Specialty::pluck('id');

    foreach (['prof1@test.com', 'prof2@test.com'] as $email) {
        $user = User::where('email', $email)->firstOrFail();

        $specialtyIds = UserSpecialty::where('user_id', $user->id)->pluck('specialty_id');

        expect($specialtyIds->count())->toBeGreaterThanOrEqual(1);
        expect($specialtyIds->count())->toBeLessThanOrEqual(2);

        foreach ($specialtyIds as $specialtyId) {
            expect($catalogSpecialtyIds->contains($specialtyId))->toBeTrue();
        }
    }
});

test("prof1's org-level specialty assignments are credential-backed by their user_specialties", function () {
    $this->seed(DatabaseSeeder::class);

    $prof1 = User::where('email', 'prof1@test.com')->firstOrFail();
    $membership = $prof1->memberships->first();

    $orgSpecialtyIds = ProfessionalSpecialty::where('membership_id', $membership->id)->pluck('specialty_id');
    $credentialSpecialtyIds = UserSpecialty::where('user_id', $prof1->id)->pluck('specialty_id');

    expect($orgSpecialtyIds->count())->toBeGreaterThanOrEqual(1);

    foreach ($orgSpecialtyIds as $specialtyId) {
        expect($credentialSpecialtyIds->contains($specialtyId))->toBeTrue();
    }
});

test("prof1's membership has at least one valid professional_services row", function () {
    $this->seed(DatabaseSeeder::class);

    $prof1 = User::where('email', 'prof1@test.com')->firstOrFail();
    $membership = $prof1->memberships->first();

    $services = ProfessionalService::where('membership_id', $membership->id)->get();

    expect($services->count())->toBeGreaterThanOrEqual(1);

    foreach ($services as $service) {
        expect($service->duration_minutes)->toBeGreaterThan(0);
        expect($service->price_cents)->toBeGreaterThan(0);
        expect($service->currency)->toBe('ARS');
    }
});

test('DatabaseSeeder seeds between 15 and 20 patients all attached to Test Organization', function () {
    $this->seed(DatabaseSeeder::class);

    $organization = Organization::where('name', 'Test Organization')->firstOrFail();

    $patients = $organization->patients;

    expect($patients->count())->toBeGreaterThanOrEqual(15);
    expect($patients->count())->toBeLessThanOrEqual(20);
});

test('the seeded patients include at least one with an insurance provider and at least one without', function () {
    $this->seed(DatabaseSeeder::class);

    $organization = Organization::where('name', 'Test Organization')->firstOrFail();

    $patients = $organization->patients;

    expect($patients->contains(fn ($patient): bool => $patient->insurance_provider_id !== null))->toBeTrue();
    expect($patients->contains(fn ($patient): bool => $patient->insurance_provider_id === null))->toBeTrue();
});

test('every seeded patient is attributed to Test User as its creator', function () {
    $this->seed(DatabaseSeeder::class);

    $testUser = User::where('email', 'test@example.com')->firstOrFail();
    $organization = Organization::where('name', 'Test Organization')->firstOrFail();

    $patients = $organization->patients;

    foreach ($patients as $patient) {
        expect($patient->created_by)->toBe($testUser->id);
    }
});

test('re-invoking ProfessionalsSeeder for the same organization does not duplicate the prof1 user', function () {
    $this->seed(DatabaseSeeder::class);

    $organization = Organization::where('name', 'Test Organization')->firstOrFail();

    // Only the user lookup (firstOrCreateUser) is idempotent: it resolves the
    // existing prof1 user before the seeder goes on to recreate memberships,
    // which aren't guarded and collide with the existing unique constraint.
    // That later failure is expected here and irrelevant to what this case
    // covers; running it inside its own transaction keeps the failure from
    // poisoning the surrounding RefreshDatabase transaction.
    expect(fn () => DB::transaction(fn () => app(ProfessionalsSeeder::class)->run($organization)))
        ->toThrow(QueryException::class);

    expect(User::where('email', 'prof1@test.com')->count())->toBe(1);
});
