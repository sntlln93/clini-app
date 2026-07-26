<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use App\Models\UserSpecialty;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('store of a specialty the target user has declared succeeds and denormalizes user_id from the membership', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();
    UserSpecialty::factory()->create(['user_id' => $membership->user_id, 'specialty_id' => $specialty->id]);

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

test('store of a specialty the target user has not declared returns 422, not 500', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('specialty_id');
});

test('store of the same pair twice is idempotent', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();
    UserSpecialty::factory()->create(['user_id' => $membership->user_id, 'specialty_id' => $specialty->id]);

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
    UserSpecialty::factory()->create(['user_id' => $otherOrgMembership->user_id, 'specialty_id' => $specialty->id]);

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
    UserSpecialty::factory()->create(['user_id' => $target->user_id, 'specialty_id' => $specialty->id]);

    $response = $this->actingAs($owner->user)->postJson("/api/v1/memberships/{$target->id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertCreated();
});

test('a professional membership can assign a specialty on its own membership', function () {
    $professional = Membership::factory()->professional()->create();
    $specialty = Specialty::factory()->create();
    UserSpecialty::factory()->create(['user_id' => $professional->user_id, 'specialty_id' => $specialty->id]);

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
    UserSpecialty::factory()->create(['user_id' => $other->user_id, 'specialty_id' => $specialty->id]);

    $response = $this->actingAs($professional->user)->postJson("/api/v1/memberships/{$other->id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertStatus(403);
});

test('a staff membership gets 403 on store', function () {
    $staff = Membership::factory()->staff()->create();
    $specialty = Specialty::factory()->create();
    UserSpecialty::factory()->create(['user_id' => $staff->user_id, 'specialty_id' => $specialty->id]);

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

test('destroy unassigns the specialty without touching the user credential row', function () {
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
    expect(
        DB::table('user_specialties')
            ->where('user_id', $membership->user_id)
            ->where('specialty_id', $specialty->id)
            ->count()
    )->toBe(1);
});

test('a guest gets 401 on index, store and destroy', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();

    $this->getJson("/api/v1/memberships/{$membership->id}/specialties")->assertStatus(401);
    $this->postJson("/api/v1/memberships/{$membership->id}/specialties", ['specialty_id' => $specialty->id])->assertStatus(401);
    $this->deleteJson("/api/v1/memberships/{$membership->id}/specialties/{$specialty->id}")->assertStatus(401);
});
