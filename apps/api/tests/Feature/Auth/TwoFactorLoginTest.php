<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use PragmaRX\Google2FA\Google2FA;

const TWO_FACTOR_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

function currentTwoFactorCode(string $secret = TWO_FACTOR_SECRET): string
{
    return (new Google2FA)->getCurrentOtp($secret);
}

function passwordStep(User $user, string $password = 'password'): TestResponse
{
    return fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => $password]);
}

test('the password alone leaves a two-factor user unauthenticated', function () {
    $user = User::factory()->withTwoFactor()->create();

    passwordStep($user)->assertOk()->assertExactJson(['two_factor' => true]);

    $this->assertGuest('web');
    fromPanel()->getJson('/api/v1/me')->assertUnauthorized();
});

test('a wrong password on a two-factor user is the plain 422, never the second step', function () {
    $user = User::factory()->withTwoFactor()->create();

    passwordStep($user, 'wrong-password')->assertStatus(422)->assertJsonMissingPath('two_factor');

    fromPanel()->postJson('/api/v1/login/two-factor', ['code' => currentTwoFactorCode()])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'auth.two_factor_challenge_expired');
    $this->assertGuest('web');
});

test('a valid authenticator code completes the login', function () {
    $user = User::factory()->withTwoFactor()->create();
    passwordStep($user);

    fromPanel()->postJson('/api/v1/login/two-factor', ['code' => currentTwoFactorCode()])
        ->assertOk()
        ->assertJsonPath('email', $user->email)
        ->assertJsonPath('two_factor_enabled', true);

    $this->assertAuthenticatedAs($user, 'web');
    fromPanel()->getJson('/api/v1/me')->assertOk();
});

test('a code with a space in the middle is accepted', function () {
    $user = User::factory()->withTwoFactor()->create();
    passwordStep($user);
    $code = currentTwoFactorCode();

    fromPanel()->postJson('/api/v1/login/two-factor', ['code' => substr($code, 0, 3).' '.substr($code, 3)])->assertOk();
});

test('a wrong code is a 409 and keeps the login pending', function () {
    $user = User::factory()->withTwoFactor()->create();
    passwordStep($user);
    $wrong = currentTwoFactorCode() === '000000' ? '111111' : '000000';

    fromPanel()->postJson('/api/v1/login/two-factor', ['code' => $wrong])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'auth.two_factor_code_invalid');
    $this->assertGuest('web');

    fromPanel()->postJson('/api/v1/login/two-factor', ['code' => currentTwoFactorCode()])->assertOk();
});

test('an authenticator code is accepted only once', function () {
    $user = User::factory()->withTwoFactor()->create();
    $code = currentTwoFactorCode();

    passwordStep($user);
    fromPanel()->postJson('/api/v1/login/two-factor', ['code' => $code])->assertOk();
    fromPanel()->postJson('/api/v1/logout')->assertNoContent();

    passwordStep($user);
    fromPanel()->postJson('/api/v1/login/two-factor', ['code' => $code])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'auth.two_factor_code_invalid');
});

test('a recovery code completes the login and is spent', function () {
    $user = User::factory()->withTwoFactor(recoveryCodes: ['abcde-fghjk', 'mnpqr-stuvw'])->create();

    passwordStep($user);
    fromPanel()->postJson('/api/v1/login/two-factor', ['recovery_code' => ' ABCDE FGHJK '])->assertOk();
    expect($user->fresh()?->two_factor_recovery_codes)->toBe(['mnpqr-stuvw']);
    fromPanel()->postJson('/api/v1/logout')->assertNoContent();

    passwordStep($user);
    fromPanel()->postJson('/api/v1/login/two-factor', ['recovery_code' => 'abcde-fghjk'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'auth.two_factor_code_invalid');
});

test('the second step needs exactly one well-formed code', function (array $payload, string $field) {
    $user = User::factory()->withTwoFactor()->create();
    passwordStep($user);

    fromPanel()->postJson('/api/v1/login/two-factor', $payload)->assertStatus(422)->assertJsonValidationErrors($field);
})->with([
    'nothing' => [[], 'code'],
    'not six digits' => [['code' => '12345a'], 'code'],
    'both kinds' => [['code' => '123456', 'recovery_code' => 'abcde-fghjk'], 'code'],
]);

test('a pending login expires after ten minutes', function () {
    $user = User::factory()->withTwoFactor()->create();
    passwordStep($user);

    $this->travel(11)->minutes();

    fromPanel()->postJson('/api/v1/login/two-factor', ['code' => currentTwoFactorCode()])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'auth.two_factor_challenge_expired');
    $this->assertGuest('web');
});

test('a user blocked after the password step cannot complete the login', function () {
    $user = User::factory()->withTwoFactor()->create();
    passwordStep($user);
    $user->forceFill(['blocked_at' => now()])->save();

    fromPanel()->postJson('/api/v1/login/two-factor', ['code' => currentTwoFactorCode()])
        ->assertForbidden()
        ->assertJsonPath('error.code', 'auth.user_blocked');
    $this->assertGuest('web');
});

test('the second step allows five tries a minute per account', function () {
    $user = User::factory()->withTwoFactor()->create();
    passwordStep($user);
    $wrong = currentTwoFactorCode() === '000000' ? '111111' : '000000';

    foreach (range(1, 5) as $attempt) {
        fromPanel()->postJson('/api/v1/login/two-factor', ['code' => $wrong])->assertStatus(409);
    }

    fromPanel()->postJson('/api/v1/login/two-factor', ['code' => currentTwoFactorCode()])->assertStatus(429);
});

test('the secret and the recovery codes are stored encrypted and never leave the api', function () {
    $user = User::factory()->withTwoFactor(recoveryCodes: ['abcde-fghjk'])->create();

    $row = DB::table('users')->where('id', $user->id)->first();
    expect($row->two_factor_secret)->not->toContain(TWO_FACTOR_SECRET)
        ->and($row->two_factor_recovery_codes)->not->toContain('abcde-fghjk');

    $this->actingAs($user)->getJson('/api/v1/me')
        ->assertOk()
        ->assertJsonPath('two_factor_enabled', true)
        ->assertJsonMissingPath('two_factor_secret')
        ->assertJsonMissingPath('two_factor_recovery_codes')
        ->assertJsonMissingPath('two_factor_confirmed_at')
        ->assertJsonMissingPath('two_factor_last_used_step');
});
