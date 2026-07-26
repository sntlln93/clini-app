<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\ProfessionalSpecialty;
use App\Models\Specialty;
use App\Models\User;
use App\Models\UserSpecialty;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;

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
