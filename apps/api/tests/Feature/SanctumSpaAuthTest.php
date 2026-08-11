<?php

declare(strict_types=1);

use App\Enums\Permission;
use App\Models\Membership;
use App\Models\User;

// Sanctum only boots the session for requests it recognizes as coming from
// the SPA (Origin/Referer matching SANCTUM_STATEFUL_DOMAINS) — a real
// browser always sends this cross-origin, so tests simulate it explicitly.
function fromSpa()
{
    return test()->withHeader('Referer', 'http://localhost:5174');
}

test('the csrf cookie endpoint sets an XSRF-TOKEN cookie', function () {
    $response = $this->get('/sanctum/csrf-cookie');

    $response->assertNoContent();
    $response->assertCookie('XSRF-TOKEN');
});

test('a user can log in with valid credentials', function () {
    $user = User::factory()->create([
        'password' => bcrypt('password'),
    ]);

    $response = fromSpa()->postJson('/api/v1/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertOk()->assertJsonPath('email', $user->email);
    $this->assertAuthenticatedAs($user);
});

test('a successful login exposes organization, roles, permissions and membership with no data envelope', function () {
    $membership = Membership::factory()->staff()->create();
    $user = $membership->user;

    $response = fromSpa()->postJson('/api/v1/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertOk()
        ->assertJsonPath('email', $user->email)
        ->assertJsonPath('organization.id', $membership->organization_id)
        ->assertJsonMissingPath('data');

    $expectedPermissions = array_map(fn (Permission $permission): string => $permission->value, $membership->permissions());

    expect($response->json('permissions'))->not->toBeEmpty();
    expect($response->json('permissions'))->toEqualCanonicalizing($expectedPermissions);
    expect($response->json('roles'))->not->toBeNull();
    expect($response->json('membership'))->not->toBeNull();
});

test('login fails with invalid credentials', function () {
    $user = User::factory()->create([
        'password' => bcrypt('password'),
    ]);

    $response = fromSpa()->postJson('/api/v1/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(422);
    $this->assertGuest();
});

test('an authenticated user can fetch their own profile', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/me');

    $response->assertOk()->assertJsonPath('email', $user->email);
});

test('an authenticated user can log out', function () {
    $user = User::factory()->create();

    $response = fromSpa()->actingAs($user)->postJson('/api/v1/logout');

    $response->assertNoContent();
});
