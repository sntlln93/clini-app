<?php

declare(strict_types=1);

use App\Enums\HealthProfession;
use App\Enums\MembershipStatus;
use App\Enums\ProfessionalLicenseMismatch;
use App\Enums\ProfessionalLicenseStatus;
use App\Enums\Province;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalLicense;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use App\Models\User;
use App\Support\FoldedText;

afterEach(function () {
    freshRequestState();
});

function catalogSpecialty(string $name, HealthProfession $profession = HealthProfession::Medico): Specialty
{
    return Specialty::factory()->create([
        'profession' => $profession,
        'name' => $name,
        'folded_name' => FoldedText::fold($name),
    ]);
}

function offerSpecialty(Membership $membership, Specialty $specialty): ProfessionalSpecialty
{
    return ProfessionalSpecialty::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'specialty_id' => $specialty->id,
    ]);
}

/**
 * @return array<string, mixed>
 */
function specialtyRow(string $name): array
{
    $response = actingAsAdmin()->getJson('/api/v1/admin/specialties')->assertOk();

    foreach ($response->json('data.professions') as $profession) {
        foreach ($profession['specialties'] as $specialty) {
            if ($specialty['name'] === $name) {
                return $specialty;
            }
        }
    }

    throw new RuntimeException("No row for {$name}.");
}

test('an empty catalog lists no profession', function () {
    actingAsAdmin()->getJson('/api/v1/admin/specialties')
        ->assertOk()
        ->assertExactJson(['data' => ['professions' => []]]);
});

test('the catalog is grouped by profession in the enum order, the profession row first and the rest by name', function () {
    catalogSpecialty('Psicólogo', HealthProfession::Psicologo);
    catalogSpecialty('Pediatría');
    catalogSpecialty('Médico');
    catalogSpecialty('Cardiología');

    $professions = actingAsAdmin()->getJson('/api/v1/admin/specialties')->assertOk()->json('data.professions');

    expect(array_column($professions, 'profession'))->toBe(['medico', 'psicologo'])
        ->and(array_column($professions[0]['specialties'], 'name'))->toBe(['Médico', 'Cardiología', 'Pediatría'])
        ->and(array_column($professions[0]['specialties'], 'without_specialty'))->toBe([true, false, false])
        ->and($professions[1]['specialties'][0]['without_specialty'])->toBeTrue();
});

test('a backed professional is a distinct user with a verified license added to clini', function () {
    $cardiology = catalogSpecialty('Cardiología');
    $twice = User::factory()->create();
    foreach ([Province::CiudadAutonomaDeBuenosAires, Province::Cordoba] as $province) {
        ProfessionalLicense::factory()->verified()->create(['user_id' => $twice->id, 'province' => $province, 'specialty_id' => $cardiology->id]);
    }
    ProfessionalLicense::factory()->verified()->create(['specialty_id' => $cardiology->id]);
    ProfessionalLicense::factory()->verified()->offered()->create(['specialty_id' => $cardiology->id]);
    ProfessionalLicense::factory()->create([
        'specialty_id' => $cardiology->id,
        'status' => ProfessionalLicenseStatus::Mismatch,
        'mismatch_reason' => ProfessionalLicenseMismatch::Sanctioned,
    ]);

    expect(specialtyRow('Cardiología')['backed_professionals'])->toBe(2);
});

test('an offer counts only while a patient could book it: an active professional of a live, unsuspended practice', function () {
    $cardiology = catalogSpecialty('Cardiología');
    $first = Organization::factory()->create();
    $second = Organization::factory()->create();
    $ana = Membership::factory()->professional()->create(['organization_id' => $first->id]);
    offerSpecialty($ana, $cardiology);
    offerSpecialty(Membership::factory()->professional()->create(['organization_id' => $second->id, 'user_id' => $ana->user_id]), $cardiology);
    offerSpecialty(Membership::factory()->professional()->create(['organization_id' => $first->id]), $cardiology);

    $deactivated = Membership::factory()->professional()->create(['organization_id' => $first->id]);
    offerSpecialty($deactivated, $cardiology);
    $deactivated->update(['status' => MembershipStatus::Inactive]);
    $deactivated->delete();
    $suspended = Membership::factory()->professional()->create(['organization_id' => $first->id]);
    offerSpecialty($suspended, $cardiology);
    $suspended->update(['status' => MembershipStatus::Suspended]);
    offerSpecialty(Membership::factory()->owner()->create(['organization_id' => $first->id]), $cardiology);
    $suspendedPractice = Organization::factory()->create();
    offerSpecialty(Membership::factory()->professional()->create(['organization_id' => $suspendedPractice->id]), $cardiology);
    $suspendedPractice->forceFill(['suspended_at' => now(), 'suspension_reason' => 'Falta de pago'])->save();
    $deletedPractice = Organization::factory()->create();
    offerSpecialty(Membership::factory()->professional()->create(['organization_id' => $deletedPractice->id]), $cardiology);
    $deletedPractice->delete();

    $row = specialtyRow('Cardiología');

    expect($row['offering_professionals'])->toBe(2)
        ->and($row['offering_organizations'])->toBe(2)
        ->and($row['unbacked_offers'])->toBe(0)
        // Every professional above still has the verified license the factory gave them.
        ->and($row['backed_professionals'])->toBe(7);
});

test('an unbacked offer is one no verified license added to clini backs anymore, the panel mark', function () {
    $cardiology = catalogSpecialty('Cardiología');
    $organization = Organization::factory()->create();
    offerSpecialty(Membership::factory()->professional()->create(['organization_id' => $organization->id]), $cardiology);
    ProfessionalSpecialty::factory()->unbacked()->create([
        'organization_id' => $organization->id,
        'membership_id' => Membership::factory()->professional()->create(['organization_id' => $organization->id])->id,
        'specialty_id' => $cardiology->id,
    ]);
    $removed = offerSpecialty(Membership::factory()->professional()->create(['organization_id' => $organization->id]), $cardiology);
    ProfessionalLicense::query()->where('user_id', $removed->user_id)->update(['added_at' => null]);

    $row = specialtyRow('Cardiología');

    expect($row['offering_professionals'])->toBe(3)
        ->and($row['unbacked_offers'])->toBe(2)
        ->and($row['backed_professionals'])->toBe(1);
});

test('licenses are counted per profession and status, mismatches by reason, only the ones added to clini', function () {
    catalogSpecialty('Médico');
    ProfessionalLicense::factory()->verified()->count(2)->create();
    ProfessionalLicense::factory()->create();
    ProfessionalLicense::factory()->offered()->create();
    foreach ([ProfessionalLicenseMismatch::NotFound, ProfessionalLicenseMismatch::Inactive, ProfessionalLicenseMismatch::Inactive] as $reason) {
        ProfessionalLicense::factory()->create(['status' => ProfessionalLicenseStatus::Mismatch, 'mismatch_reason' => $reason]);
    }
    ProfessionalLicense::factory()->create(['profession' => HealthProfession::Kinesiologo]);

    $professions = collect(actingAsAdmin()->getJson('/api/v1/admin/specialties')->assertOk()->json('data.professions'))
        ->keyBy('profession');

    expect($professions['medico']['licenses'])->toBe([
        'verified' => 2,
        'unverified' => 1,
        'mismatch' => 3,
        'mismatch_reasons' => ['not_found' => 1, 'inactive' => 2, 'sanctioned' => 0, 'not_enabled' => 0],
    ])
        // A profession with licenses but no catalog row yet is still listed.
        ->and($professions['kinesiologo']['licenses']['unverified'])->toBe(1)
        ->and($professions['kinesiologo']['specialties'])->toBe([]);
});

test('the answer carries only counts, never who: no user, membership, document or license', function () {
    $cardiology = catalogSpecialty('Cardiología');
    $user = User::factory()->create(['name' => 'Zulema Quintana', 'email' => 'zulema@example.com', 'document_number' => '30111222']);
    $membership = Membership::factory()->professional()->create(['user_id' => $user->id]);
    ProfessionalLicense::factory()->verified()->create([
        'user_id' => $user->id,
        'number' => 'MN98765',
        'province' => Province::Cordoba,
        'specialty_id' => $cardiology->id,
    ]);
    offerSpecialty($membership, $cardiology);

    $response = actingAsAdmin()->getJson('/api/v1/admin/specialties')->assertOk();

    $response->assertExactJsonStructure(['data' => ['professions' => ['*' => [
        'profession',
        'licenses' => ['verified', 'unverified', 'mismatch', 'mismatch_reasons' => ['not_found', 'inactive', 'sanctioned', 'not_enabled']],
        'specialties' => ['*' => [
            'id', 'name', 'without_specialty', 'backed_professionals', 'offering_professionals', 'offering_organizations', 'unbacked_offers',
        ]],
    ]]]]);
    foreach (['Zulema', 'zulema@example.com', '30111222', 'MN98765', Province::Cordoba->value] as $individual) {
        expect($response->getContent())->not->toContain($individual);
    }
});
