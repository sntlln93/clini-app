<?php

declare(strict_types=1);

use App\Enums\ProfessionalLicenseMismatch;
use App\Enums\ProfessionalLicenseStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalLicense;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * A verified license of the user that backs the specialty (#387).
 */
function backSpecialty(int $userId, Specialty $specialty): ProfessionalLicense
{
    return ProfessionalLicense::factory()->verified()->create([
        'user_id' => $userId,
        'profession' => $specialty->profession,
        'specialty_id' => $specialty->id,
    ]);
}

test('store of a specialty a verified license of the target user backs succeeds and denormalizes user_id from the membership', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();
    backSpecialty($membership->user_id, $specialty);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertCreated();
    expect(
        DB::table('professional_specialties')
            ->where('membership_id', $membership->id)
            ->where('specialty_id', $specialty->id)
            ->value('user_id')
    )->toBe($membership->user_id);
});

test('store of a specialty no verified license of the target user backs returns 422', function (string $backing) {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();

    match ($backing) {
        'none' => null,
        'an unverified license' => ProfessionalLicense::factory()->create(['user_id' => $membership->user_id, 'specialty_id' => $specialty->id]),
        'a license that doesn\'t match' => ProfessionalLicense::factory()->verified()->create(['user_id' => $membership->user_id, 'specialty_id' => $specialty->id])
            ->forceFill(['status' => ProfessionalLicenseStatus::Mismatch, 'mismatch_reason' => ProfessionalLicenseMismatch::Sanctioned])->save(),
        'another user\'s license' => backSpecialty(User::factory()->create()->id, $specialty),
    };

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['specialty_id' => 'Ninguna matrícula verificada del profesional respalda esta especialidad.']);
    expect(ProfessionalSpecialty::query()->count())->toBe(0);
})->with(['none', 'an unverified license', 'a license that doesn\'t match', 'another user\'s license']);

test('store of the same pair twice is idempotent', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();
    backSpecialty($membership->user_id, $specialty);

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/specialties", [
        'specialty_id' => $specialty->id,
    ])->assertCreated();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertCreated();
    expect(
        DB::table('professional_specialties')
            ->where('membership_id', $membership->id)
            ->where('specialty_id', $specialty->id)
            ->count()
    )->toBe(1);
});

test('store on a membership belonging to another organization returns 422', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();
    backSpecialty($otherOrgMembership->user_id, $specialty);

    $response = $this->actingAs($owner->user)->postJson("/api/v1/memberships/{$otherOrgMembership->id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('membership_id');
});

test('an owner membership can assign a specialty on any member membership', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $target = Membership::factory()->create(['organization_id' => $organization->id]);
    $specialty = Specialty::factory()->create();
    backSpecialty($target->user_id, $specialty);

    $response = $this->actingAs($owner->user)->postJson("/api/v1/memberships/{$target->id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertCreated();
});

test('a professional membership can assign a specialty on its own membership', function () {
    $professional = Membership::factory()->professional()->create();
    $specialty = Specialty::factory()->create();
    backSpecialty($professional->user_id, $specialty);

    $response = $this->actingAs($professional->user)->postJson("/api/v1/memberships/{$professional->id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertCreated();
});

test('a professional membership assigning a specialty on another member membership gets 403', function () {
    $organization = Organization::factory()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $other = Membership::factory()->create(['organization_id' => $organization->id]);
    $specialty = Specialty::factory()->create();
    backSpecialty($other->user_id, $specialty);

    $response = $this->actingAs($professional->user)->postJson("/api/v1/memberships/{$other->id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertStatus(403);
});

test('a staff membership gets 403 on store', function () {
    $staff = Membership::factory()->staff()->create();
    $specialty = Specialty::factory()->create();
    backSpecialty($staff->user_id, $specialty);

    $response = $this->actingAs($staff->user)->postJson("/api/v1/memberships/{$staff->id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertStatus(403);
});

test('index lists the specialties practised by that membership', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();
    ProfessionalSpecialty::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'specialty_id' => $specialty->id,
    ]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/memberships/{$membership->id}/specialties");

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('specialty_id'))->toContain($specialty->id);
});

test('index on a membership of another organization is rejected', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();
    ProfessionalSpecialty::factory()->create([
        'organization_id' => $otherOrgMembership->organization_id,
        'membership_id' => $otherOrgMembership->id,
        'specialty_id' => $specialty->id,
    ]);

    $response = $this->actingAs($owner->user)->getJson("/api/v1/memberships/{$otherOrgMembership->id}/specialties");

    $response->assertStatus(403);
});

test('destroy unassigns the specialty without touching the license that backs it', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();
    ProfessionalSpecialty::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'specialty_id' => $specialty->id,
    ]);

    $response = $this->actingAs($membership->user)->deleteJson("/api/v1/memberships/{$membership->id}/specialties/{$specialty->id}");

    $response->assertNoContent();
    expect(
        DB::table('professional_specialties')
            ->where('membership_id', $membership->id)
            ->where('specialty_id', $specialty->id)
            ->count()
    )->toBe(0);
    expect(Specialty::query()->backedFor($membership->user_id)->pluck('id')->all())->toBe([$specialty->id]);
});

test('a guest gets 401 on index, store and destroy', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();

    $this->getJson("/api/v1/memberships/{$membership->id}/specialties")->assertStatus(401);
    $this->postJson("/api/v1/memberships/{$membership->id}/specialties", ['specialty_id' => $specialty->id])->assertStatus(401);
    $this->deleteJson("/api/v1/memberships/{$membership->id}/specialties/{$specialty->id}")->assertStatus(401);
});

test('a specialty whose license stops being verified stays offered, and only the professionals list marks it', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    [$kept, $lost] = Specialty::factory()->count(2)->sequence(['name' => 'Cardiología'], ['name' => 'Pediatría'])->create();
    ProfessionalSpecialty::factory()->create(['organization_id' => $organization->id, 'membership_id' => $membership->id, 'specialty_id' => $kept->id]);
    ProfessionalSpecialty::factory()->unbacked()->create(['organization_id' => $organization->id, 'membership_id' => $membership->id, 'specialty_id' => $lost->id]);

    $this->actingAs($owner->user)->getJson('/api/v1/memberships?per_page=50')
        ->assertOk()
        ->assertJsonPath('data.1.specialties', [
            ['id' => $kept->id, 'name' => 'Cardiología', 'profession' => 'medico', 'backed' => true],
            ['id' => $lost->id, 'name' => 'Pediatría', 'profession' => 'medico', 'backed' => false],
        ]);

    // Still offered: what the practice and the patient see doesn't change.
    $this->actingAs($owner->user)->getJson("/api/v1/memberships/{$membership->id}/specialties")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonMissingPath('data.0.backed');

    // It can't be offered again until a license backs it.
    $this->actingAs($owner->user)->deleteJson("/api/v1/memberships/{$membership->id}/specialties/{$lost->id}")->assertNoContent();
    $this->actingAs($owner->user)->postJson("/api/v1/memberships/{$membership->id}/specialties", ['specialty_id' => $lost->id])
        ->assertUnprocessable();
});

test('the backed specialties of a professional are what their verified licenses back, once each', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $pediatrics = Specialty::factory()->create(['name' => 'Pediatría']);
    $dentist = Specialty::factory()->create(['profession' => 'odontologo', 'name' => 'Odontólogo']);
    backSpecialty($membership->user_id, $pediatrics);
    // A second license backing the same one lists it once.
    backSpecialty($membership->user_id, $pediatrics);
    backSpecialty($membership->user_id, $dentist);
    ProfessionalLicense::factory()->create(['user_id' => $membership->user_id, 'specialty_id' => Specialty::factory()->create()->id]);

    $this->actingAs($owner->user)->getJson("/api/v1/memberships/{$membership->id}/backed-specialties")
        ->assertOk()
        ->assertExactJson(['data' => [
            ['id' => $dentist->id, 'name' => 'Odontólogo', 'profession' => 'odontologo'],
            ['id' => $pediatrics->id, 'name' => 'Pediatría', 'profession' => 'medico'],
        ]]);
});

test('the backed specialties are read by who chooses them or sees the professionals, nobody else', function (string $actor, int $status) {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    backSpecialty($membership->user_id, Specialty::factory()->create());
    $reader = match ($actor) {
        'the professional' => $membership,
        'an owner' => Membership::factory()->owner()->create(['organization_id' => $organization->id]),
        'another professional' => Membership::factory()->professional()->create(['organization_id' => $organization->id]),
        'staff' => Membership::factory()->staff()->create(['organization_id' => $organization->id]),
        'an owner elsewhere' => Membership::factory()->owner()->create(),
    };

    $this->actingAs($reader->user)->getJson("/api/v1/memberships/{$membership->id}/backed-specialties")->assertStatus($status);
})->with([
    'the professional' => ['the professional', 200],
    'an owner' => ['an owner', 200],
    'another professional' => ['another professional', 403],
    'staff' => ['staff', 403],
    'an owner elsewhere' => ['an owner elsewhere', 403],
]);

test('the public booking page never says whether a license backs a specialty', function () {
    $membership = Membership::factory()->professional()->create();
    ProfessionalSpecialty::factory()->unbacked()->create(['organization_id' => $membership->organization_id, 'membership_id' => $membership->id]);

    $response = $this->getJson("/api/v1/booking/{$membership->organization->slug}");

    expect(json_encode($response->json()))->not->toContain('backed');
});
