<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\User;

afterEach(function () {
    freshRequestState();
});

function blockUser(User $user): void
{
    $user->forceFill(['blocked_at' => now(), 'block_reason' => 'Abuso'])->save();
}

test('a blocked user with the right password gets 403 auth.user_blocked and stays a guest', function () {
    $user = User::factory()->create();
    blockUser($user);

    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])
        ->assertForbidden()
        ->assertJsonPath('error.code', 'auth.user_blocked')
        ->assertJsonPath('error.context', []);

    $this->assertGuest('web');
});

test('a blocked user with a wrong password gets the plain 422, disclosing nothing', function () {
    $user = User::factory()->create();
    blockUser($user);

    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'wrong-password'])
        ->assertStatus(422)
        ->assertExactJson(['message' => 'Invalid credentials.']);
});

test('an open session of a user blocked afterwards is rejected on /me, then unauthenticated', function () {
    $user = Membership::factory()->owner()->create()->user;

    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
    freshRequestState();
    blockUser($user);

    $this->getJson('/api/v1/me')->assertForbidden()->assertJsonPath('error.code', 'auth.user_blocked');
    freshRequestState();
    $this->getJson('/api/v1/me')->assertUnauthorized();
});

test('an open session of a user blocked afterwards is rejected on org-scoped routes', function (string $uri) {
    $user = Membership::factory()->owner()->create()->user;
    blockUser($user);

    $this->actingAs($user)->getJson($uri)
        ->assertForbidden()
        ->assertJsonPath('error.code', 'auth.user_blocked');
})->with([
    'patients' => ['/api/v1/patients'],
    'subscription' => ['/api/v1/subscription'],
]);

test('a blocked user can still log out', function () {
    $user = User::factory()->create();
    blockUser($user);

    fromPanel()->actingAs($user)->postJson('/api/v1/logout')->assertNoContent();
});

test('an unblocked user logs in normally again', function () {
    $user = Membership::factory()->owner()->create()->user;
    blockUser($user);

    actingAsAdmin()->deleteJson("/api/v1/admin/users/{$user->id}/block")->assertOk();
    freshRequestState();

    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('email', $user->email);
    freshRequestState();
    fromPanel()->getJson('/api/v1/patients')->assertOk();
});
