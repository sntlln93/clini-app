<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Testing\TestResponse;
use PragmaRX\Google2FA\Google2FA;

function signedInClinicUser(User $user): User
{
    test()->actingAs($user, 'web');

    return $user;
}

function startSetup(string $password = 'password'): TestResponse
{
    return fromPanel()->postJson('/api/v1/me/two-factor', ['password' => $password]);
}

test('starting a setup needs the current password', function () {
    $user = signedInClinicUser(User::factory()->create());

    startSetup('wrong-password')
        ->assertStatus(422)
        ->assertJsonValidationErrors(['password' => 'La contraseña no es correcta.']);

    expect($user->fresh()?->two_factor_secret)->toBeNull();
});

test('starting a setup returns a secret, its otpauth uri and a qr code, and enables nothing yet', function () {
    $user = signedInClinicUser(User::factory()->create(['email' => 'ana@clini.test']));

    $response = startSetup()->assertCreated();

    $secret = $response->json('data.secret');
    expect($secret)->toBeString()->toHaveLength(32)
        ->and($response->json('data.provisioning_uri'))->toStartWith('otpauth://totp/')->toContain('secret='.$secret)
        ->and($response->json('data.qr_code_svg'))->toContain('<svg');

    $fresh = $user->fresh();
    expect($fresh?->two_factor_secret)->toBe($secret)
        ->and($fresh?->hasTwoFactorEnabled())->toBeFalse();
});

test('confirming with a valid code enables the factor and answers eight recovery codes once', function () {
    $user = signedInClinicUser(User::factory()->create());
    $secret = startSetup()->json('data.secret');

    $response = fromPanel()->postJson('/api/v1/me/two-factor/confirmation', ['code' => (new Google2FA)->getCurrentOtp($secret)])
        ->assertOk();

    $codes = $response->json('data.recovery_codes');
    expect($codes)->toHaveCount(8)->each->toMatch('/^[a-z2-9]{5}-[a-z2-9]{5}$/');
    expect($user->fresh()?->hasTwoFactorEnabled())->toBeTrue();
});

test('confirming with a wrong code is a 409 and leaves the factor off', function () {
    $user = signedInClinicUser(User::factory()->create());
    $secret = startSetup()->json('data.secret');
    $wrong = (new Google2FA)->getCurrentOtp($secret) === '000000' ? '111111' : '000000';

    fromPanel()->postJson('/api/v1/me/two-factor/confirmation', ['code' => $wrong])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'auth.two_factor_code_invalid');

    expect($user->fresh()?->hasTwoFactorEnabled())->toBeFalse();
});

test('confirming without a started setup is a 409', function () {
    signedInClinicUser(User::factory()->create());

    fromPanel()->postJson('/api/v1/me/two-factor/confirmation', ['code' => '123456'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'auth.two_factor_setup_missing');
});

test('the code that confirmed the setup cannot also open a login', function () {
    $user = signedInClinicUser(User::factory()->create());
    $secret = startSetup()->json('data.secret');
    $code = (new Google2FA)->getCurrentOtp($secret);
    fromPanel()->postJson('/api/v1/me/two-factor/confirmation', ['code' => $code])->assertOk();
    fromPanel()->postJson('/api/v1/logout')->assertNoContent();

    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])->assertJsonPath('two_factor', true);
    fromPanel()->postJson('/api/v1/login/two-factor', ['code' => $code])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'auth.two_factor_code_invalid');
});

test('a user with the factor on cannot start another setup', function () {
    signedInClinicUser(User::factory()->withTwoFactor()->create());

    startSetup()->assertStatus(409)->assertJsonPath('error.code', 'auth.two_factor_already_enabled');
});

test('turning the factor off needs the password and then logs in with the password alone', function () {
    $user = signedInClinicUser(User::factory()->withTwoFactor()->create());

    fromPanel()->deleteJson('/api/v1/me/two-factor', ['password' => 'wrong-password'])->assertStatus(422);
    expect($user->fresh()?->hasTwoFactorEnabled())->toBeTrue();

    fromPanel()->deleteJson('/api/v1/me/two-factor', ['password' => 'password'])->assertNoContent();
    $fresh = $user->fresh();
    expect($fresh?->hasTwoFactorEnabled())->toBeFalse()
        ->and($fresh?->two_factor_secret)->toBeNull()
        ->and($fresh?->two_factor_recovery_codes)->toBeNull();

    fromPanel()->postJson('/api/v1/logout')->assertNoContent();
    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('email', $user->email);
});

test('turning off a factor that is not on is a 409', function () {
    signedInClinicUser(User::factory()->create());

    fromPanel()->deleteJson('/api/v1/me/two-factor', ['password' => 'password'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'auth.two_factor_not_enabled');
});

test('regenerating the recovery codes needs the password and replaces every code', function () {
    $user = signedInClinicUser(User::factory()->withTwoFactor(recoveryCodes: ['abcde-fghjk'])->create());

    fromPanel()->postJson('/api/v1/me/two-factor/recovery-codes', ['password' => 'wrong-password'])->assertStatus(422);

    $codes = fromPanel()->postJson('/api/v1/me/two-factor/recovery-codes', ['password' => 'password'])
        ->assertOk()
        ->json('data.recovery_codes');

    expect($codes)->toHaveCount(8)->not->toContain('abcde-fghjk')
        ->and($user->fresh()?->two_factor_recovery_codes)->toBe($codes);
});

test('regenerating recovery codes without the factor on is a 409', function () {
    signedInClinicUser(User::factory()->create());

    fromPanel()->postJson('/api/v1/me/two-factor/recovery-codes', ['password' => 'password'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'auth.two_factor_not_enabled');
});

test('the settings need a signed-in clinic user', function () {
    fromPanel()->postJson('/api/v1/me/two-factor', ['password' => 'password'])->assertUnauthorized();
});

test('the settings allow ten password or code checks a minute per user', function () {
    signedInClinicUser(User::factory()->create());

    foreach (range(1, 10) as $attempt) {
        startSetup('wrong-password')->assertStatus(422);
    }

    startSetup()->assertStatus(429);
});
