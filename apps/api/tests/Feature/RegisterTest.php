<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\Permission;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;

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
    expect($membership->roles)->toBe([MembershipRole::Owner, MembershipRole::Professional]);
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

test('registering exposes the new owner membership permissions, roles and organization', function () {
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
    $membership = Membership::where('organization_id', $organization->id)->firstOrFail();

    $expectedPermissions = array_map(fn (Permission $permission): string => $permission->value, $membership->permissions());

    $response->assertJsonPath('organization.id', $organization->id);
    expect($response->json('permissions'))->not->toBeEmpty();
    expect($response->json('permissions'))->toEqualCanonicalizing($expectedPermissions);
    expect($response->json('roles'))->toContain(MembershipRole::Owner->value);
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

test('the owner registers as owner and professional without being asked', function () {
    registerFromSpa()->postJson('/api/v1/register', [
        'name' => 'Ana Owner',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => 'Clínica Norte',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ])->assertCreated()
        ->assertJsonPath('roles', [MembershipRole::Owner->value, MembershipRole::Professional->value]);

    $membership = Membership::query()->withoutGlobalScope('organization')->sole();

    expect($membership->roles)->toBe([MembershipRole::Owner, MembershipRole::Professional]);
});

test('the retired attends_patients flag no longer registers an owner who is not a professional', function () {
    registerFromSpa()->postJson('/api/v1/register', [
        'name' => 'Ana Owner',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => 'Clínica Norte',
        'timezone' => 'America/Argentina/Buenos_Aires',
        'attends_patients' => false,
    ])->assertCreated();

    expect(Membership::query()->withoutGlobalScope('organization')->sole()->roles)
        ->toBe([MembershipRole::Owner, MembershipRole::Professional]);
});

test('the registering owner fills the Free plan professional slot', function () {
    registerFromSpa()->postJson('/api/v1/register', [
        'name' => 'Ana Owner',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => 'Clínica Norte',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ])->assertCreated();

    Mail::fake();

    registerFromSpa()->postJson('/api/v1/memberships/invitations', [
        'email' => 'segunda@example.com',
        'roles' => [MembershipRole::Professional->value],
    ])->assertStatus(409)
        ->assertJsonPath('error.code', 'plans.feature_unavailable');
});

test('the sixth registration within a minute from one ip is a 429 that creates no account (#299)', function () {
    Mail::fake();
    $register = fn (int $n) => registerFromSpa()->postJson('/api/v1/register', [
        'name' => 'Ana Owner',
        'email' => "ana{$n}@example.com",
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => "Clínica {$n}",
        'timezone' => 'America/Argentina/Buenos_Aires',
    ]);

    foreach (range(1, 5) as $n) {
        $register($n)->assertCreated();
    }

    $register(6)
        ->assertStatus(429)
        ->assertHeader('Retry-After');
    expect(User::query()->count())->toBe(5);

    $this->travel(61)->seconds();
    $register(7)->assertCreated();
});
