<?php

declare(strict_types=1);

use App\Enums\MembershipStatus;
use App\Enums\Permission;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use App\Models\User;
use App\Models\UserSpecialty;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('index returns the user own credential specialties', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();
    UserSpecialty::factory()->create(['user_id' => $membership->user_id, 'specialty_id' => $specialty->id]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/users/{$membership->user_id}/specialties");

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('specialty_id'))->toContain($specialty->id);
});

/**
 * A real HTTP round trip can never reach the controller with
 * CurrentOrganization actually null: the 'organization' route middleware
 * (App\Http\Middleware\ResolveCurrentOrganization) aborts 403 first for any
 * user without an active membership, and resolves one otherwise — see
 * tests/Feature/Auth/CurrentOrganizationMiddlewareTest.php. So this asserts
 * the policy directly, the same way the identity check is meant to work
 * regardless of organization context.
 */
test('viewAny allows self-read with no organization in scope', function () {
    $user = User::factory()->create();
    $specialty = Specialty::factory()->create();
    UserSpecialty::factory()->create(['user_id' => $user->id, 'specialty_id' => $specialty->id]);

    app(CurrentOrganization::class)->set(null);

    expect(Gate::forUser($user)->allows('viewAny', [UserSpecialty::class, $user]))->toBeTrue();
});

test('index allows an org-wide catalog reader to view a colleague credential', function () {
    $organization = Organization::factory()->create();
    $actorMembership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $targetMembership = Membership::factory()->create(['organization_id' => $organization->id]);
    $specialty = Specialty::factory()->create();
    UserSpecialty::factory()->create(['user_id' => $targetMembership->user_id, 'specialty_id' => $specialty->id]);

    expect($actorMembership->permissions())->toContain(Permission::CatalogView);
    expect($actorMembership->permissions())->not->toContain(Permission::CatalogManage);

    app(CurrentOrganization::class)->set($organization->id);

    $response = $this->actingAs($actorMembership->user)->getJson("/api/v1/users/{$targetMembership->user_id}/specialties");

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('specialty_id'))->toContain($specialty->id);
});

test('index allows an actor whose only catalog permission is CatalogManage', function () {
    $organization = Organization::factory()->create();
    $actorMembership = Membership::factory()
        ->state(['roles' => [], 'extra_permissions' => [Permission::CatalogManage]])
        ->create(['organization_id' => $organization->id]);
    $targetMembership = Membership::factory()->create(['organization_id' => $organization->id]);
    $specialty = Specialty::factory()->create();
    UserSpecialty::factory()->create(['user_id' => $targetMembership->user_id, 'specialty_id' => $specialty->id]);

    expect($actorMembership->permissions())->toContain(Permission::CatalogManage);
    expect($actorMembership->permissions())->not->toContain(Permission::CatalogView);

    app(CurrentOrganization::class)->set($organization->id);

    $response = $this->actingAs($actorMembership->user)->getJson("/api/v1/users/{$targetMembership->user_id}/specialties");

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('specialty_id'))->toContain($specialty->id);
});

test('index denies a member of the same organization without a catalog permission', function () {
    $organization = Organization::factory()->create();
    $actorMembership = Membership::factory()
        ->state(['roles' => [], 'extra_permissions' => []])
        ->create(['organization_id' => $organization->id]);
    $targetMembership = Membership::factory()->create(['organization_id' => $organization->id]);

    expect($actorMembership->permissions())->not->toContain(Permission::CatalogView);
    expect($actorMembership->permissions())->not->toContain(Permission::CatalogManage);

    app(CurrentOrganization::class)->set($organization->id);

    $response = $this->actingAs($actorMembership->user)->getJson("/api/v1/users/{$targetMembership->user_id}/specialties");

    $response->assertStatus(403);
});

test('index denies an actor and target with no organization in common', function () {
    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();
    $actorMembership = Membership::factory()->owner()->create(['organization_id' => $organizationA->id]);
    $targetMembership = Membership::factory()->create(['organization_id' => $organizationB->id]);

    expect($actorMembership->permissions())->toContain(Permission::CatalogManage);

    app(CurrentOrganization::class)->set($organizationA->id);

    $response = $this->actingAs($actorMembership->user)->getJson("/api/v1/users/{$targetMembership->user_id}/specialties");

    $response->assertStatus(403);
});

test('viewAny denies when the target membership in the actor organization is not active', function () {
    $organization = Organization::factory()->create();
    $actorMembership = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $targetMembership = Membership::factory()->create([
        'organization_id' => $organization->id,
        'status' => MembershipStatus::Inactive,
    ]);
    $specialty = Specialty::factory()->create();
    UserSpecialty::factory()->create(['user_id' => $targetMembership->user_id, 'specialty_id' => $specialty->id]);

    expect($actorMembership->permissions())->toContain(Permission::CatalogManage);

    app(CurrentOrganization::class)->set($organization->id);

    $response = $this->actingAs($actorMembership->user)->getJson("/api/v1/users/{$targetMembership->user_id}/specialties");

    $response->assertStatus(403);
});

test('store assigns a specialty to the own credential and creates exactly one row', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/users/{$membership->user_id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertCreated();
    expect(
        DB::table('user_specialties')
            ->where('user_id', $membership->user_id)
            ->where('specialty_id', $specialty->id)
            ->count()
    )->toBe(1);
});

test('store of the same specialty twice is idempotent', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();

    $this->actingAs($membership->user)->postJson("/api/v1/users/{$membership->user_id}/specialties", [
        'specialty_id' => $specialty->id,
    ])->assertCreated();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/users/{$membership->user_id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertCreated();
    expect(
        DB::table('user_specialties')
            ->where('user_id', $membership->user_id)
            ->where('specialty_id', $specialty->id)
            ->count()
    )->toBe(1);
});

test('store with a specialty_id that does not exist returns 422', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/users/{$membership->user_id}/specialties", [
        'specialty_id' => 999999,
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('specialty_id');
});

test('store on another user credential returns 403', function () {
    $membership = Membership::factory()->create();
    $otherUser = User::factory()->create();
    $specialty = Specialty::factory()->create();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/users/{$otherUser->id}/specialties", [
        'specialty_id' => $specialty->id,
    ]);

    $response->assertStatus(403);
});

test('destroy removes the own credential row', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();
    UserSpecialty::factory()->create(['user_id' => $membership->user_id, 'specialty_id' => $specialty->id]);

    $response = $this->actingAs($membership->user)->deleteJson("/api/v1/users/{$membership->user_id}/specialties/{$specialty->id}");

    $response->assertNoContent();
    expect(
        DB::table('user_specialties')
            ->where('user_id', $membership->user_id)
            ->where('specialty_id', $specialty->id)
            ->count()
    )->toBe(0);
});

test('destroy on another user credential returns 403', function () {
    $membership = Membership::factory()->create();
    $otherUser = User::factory()->create();
    $specialty = Specialty::factory()->create();
    UserSpecialty::factory()->create(['user_id' => $otherUser->id, 'specialty_id' => $specialty->id]);

    $response = $this->actingAs($membership->user)->deleteJson("/api/v1/users/{$otherUser->id}/specialties/{$specialty->id}");

    $response->assertStatus(403);
    expect(
        DB::table('user_specialties')
            ->where('user_id', $otherUser->id)
            ->where('specialty_id', $specialty->id)
            ->count()
    )->toBe(1);
});

test('a guest gets 401 on index, store and destroy', function () {
    $user = User::factory()->create();
    $specialty = Specialty::factory()->create();

    $this->getJson("/api/v1/users/{$user->id}/specialties")->assertStatus(401);
    $this->postJson("/api/v1/users/{$user->id}/specialties", ['specialty_id' => $specialty->id])->assertStatus(401);
    $this->deleteJson("/api/v1/users/{$user->id}/specialties/{$specialty->id}")->assertStatus(401);
});

test('removing a credential still practised in an organization cascades the matching professional_specialties row away', function () {
    $membership = Membership::factory()->create();
    $specialty = Specialty::factory()->create();
    ProfessionalSpecialty::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'specialty_id' => $specialty->id,
    ]);

    expect(
        DB::table('professional_specialties')
            ->where('membership_id', $membership->id)
            ->where('specialty_id', $specialty->id)
            ->count()
    )->toBe(1);

    $response = $this->actingAs($membership->user)->deleteJson("/api/v1/users/{$membership->user_id}/specialties/{$specialty->id}");

    $response->assertNoContent();
    expect(
        DB::table('professional_specialties')
            ->where('membership_id', $membership->id)
            ->where('specialty_id', $specialty->id)
            ->count()
    )->toBe(0);
});
