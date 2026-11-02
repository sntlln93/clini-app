<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\Hash;

afterEach(function () {
    freshRequestState();
});

const NEW_PASSWORD = 'una-clave-nueva-y-larga';

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function passwordChange(array $overrides = []): array
{
    return [
        'current_password' => 'password',
        'password' => NEW_PASSWORD,
        'password_confirmation' => NEW_PASSWORD,
        ...$overrides,
    ];
}

test('a clinic user changes their password with the current one and stays signed in', function () {
    $user = User::factory()->create();
    $oldRememberToken = $user->remember_token;
    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])->assertOk();

    fromPanel()->putJson('/api/v1/me/password', passwordChange())->assertNoContent();

    $user->refresh();
    expect(Hash::check(NEW_PASSWORD, $user->password))->toBeTrue()
        ->and($user->remember_token)->not->toBe($oldRememberToken);

    // The same session goes on with the new hash stored in it.
    freshRequestState();
    fromPanel()->getJson('/api/v1/me')->assertOk();
});

test('a wrong current password answers 422 and changes nothing', function () {
    $user = User::factory()->create();
    $hash = $user->password;

    $this->actingAs($user, 'web');
    fromPanel()->putJson('/api/v1/me/password', passwordChange(['current_password' => 'no-es-esta']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['current_password' => 'La contraseña actual no es correcta.'])
        ->assertJsonMissingValidationErrors('password');

    expect($user->refresh()->password)->toBe($hash);
});

test('the new password has to be confirmed', function () {
    $this->actingAs(User::factory()->create(), 'web');

    fromPanel()->putJson('/api/v1/me/password', passwordChange(['password_confirmation' => 'otra-cosa-distinta']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['password' => 'Las contraseñas no coinciden.']);
});

test('a session opened elsewhere is ended by the change on its next call', function () {
    $user = User::factory()->create();
    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
    fromPanel()->getJson('/api/v1/me')->assertOk();
    $openSession = app('session.store')->all();
    freshRequestState();

    // Another device changes the password.
    app('session.store')->flush();
    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
    fromPanel()->putJson('/api/v1/me/password', passwordChange())->assertNoContent();
    freshRequestState();

    // The first device comes back with its own session.
    app('session.store')->flush();
    $this->withSession($openSession);
    fromPanel()->getJson('/api/v1/me')->assertUnauthorized();
});

test('a guest can\'t change a password, nor a script on the dashboard origin', function () {
    fromPanel()->putJson('/api/v1/me/password', passwordChange())->assertUnauthorized();

    $user = User::factory()->create();
    $this->actingAs($user, 'web');
    fromDashboard()->putJson('/api/v1/me/password', passwordChange())->assertForbidden();

    expect(Hash::check('password', $user->refresh()->password))->toBeTrue();
});

test('a blocked user can\'t change their password', function () {
    $user = User::factory()->create(['blocked_at' => now()]);
    $this->actingAs($user, 'web');

    fromPanel()->putJson('/api/v1/me/password', passwordChange())->assertForbidden();

    expect(Hash::check('password', $user->refresh()->password))->toBeTrue();
});
