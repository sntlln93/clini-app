<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

// Sanctum only boots the session for requests it recognizes as coming from
// the SPA (Origin/Referer matching SANCTUM_STATEFUL_DOMAINS) — a real
// browser always sends this cross-origin, so tests simulate it explicitly.
function registerFromSpa()
{
    return test()->withHeader('Referer', 'http://localhost:5174');
}

test('a visitor can register a new organization as its owner', function () {
    $response = registerFromSpa()->postJson('/api/v1/register', [
        'name' => 'Ana Owner',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => 'Clínica Norte',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ]);

    $response->assertCreated();
    $response->assertJsonPath('email', 'ana@example.com');
    $response->assertJsonMissingPath('password');

    $this->assertDatabaseHas('users', [
        'email' => 'ana@example.com',
    ]);

    $this->assertDatabaseHas('organizations', [
        'name' => 'Clínica Norte',
    ]);

    $user = User::where('email', 'ana@example.com')->firstOrFail();
    $organization = Organization::where('name', 'Clínica Norte')->firstOrFail();

    $this->assertDatabaseHas('memberships', [
        'user_id' => $user->id,
        'organization_id' => $organization->id,
        'status' => MembershipStatus::Active->value,
    ]);

    $membership = Membership::where('user_id', $user->id)->firstOrFail();
    expect($membership->roles)->toBe([MembershipRole::Owner]);
});

test('registering logs the user in', function () {
    $response = registerFromSpa()->postJson('/api/v1/register', [
        'name' => 'Ana Owner',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => 'Clínica Norte',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ]);

    $response->assertCreated();

    // Within a single Pest test, the app container (and therefore the auth
    // guard) persists across chained HTTP calls, unlike two real requests
    // hitting a fresh process each. Forget the guard so /api/v1/me re-resolves
    // the user from the session by id instead of reusing the in-memory
    // model `register` just created (which still carries
    // `wasRecentlyCreated = true`, and Laravel's router special-cases that
    // to a 201 response for a bare Eloquent model return value).
    Auth::forgetGuards();

    $me = registerFromSpa()->getJson('/api/v1/me');

    $me->assertOk();
    $me->assertJsonPath('email', 'ana@example.com');
});

test('registering with a duplicate email fails validation and persists nothing', function () {
    User::factory()->create(['email' => 'ana@example.com']);

    $response = registerFromSpa()->postJson('/api/v1/register', [
        'name' => 'Ana Owner',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => 'Clínica Norte',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('email');

    $this->assertDatabaseCount('users', 1);
    $this->assertDatabaseCount('organizations', 0);
    $this->assertDatabaseCount('memberships', 0);
});

test('registering with a colliding organization slug appends a numeric suffix', function () {
    Organization::factory()->create(['slug' => 'clinica-norte']);

    $response = registerFromSpa()->postJson('/api/v1/register', [
        'name' => 'Ana Owner',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => 'Clínica Norte',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ]);

    $response->assertCreated();

    $organization = Organization::where('name', 'Clínica Norte')->firstOrFail();

    expect($organization->slug)->toBe('clinica-norte-2');
});

test('registering with an invalid timezone fails validation and persists nothing', function () {
    $response = registerFromSpa()->postJson('/api/v1/register', [
        'name' => 'Ana Owner',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => 'Clínica Norte',
        'timezone' => 'Not/AZone',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('timezone');

    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('organizations', 0);
    $this->assertDatabaseCount('memberships', 0);
});
