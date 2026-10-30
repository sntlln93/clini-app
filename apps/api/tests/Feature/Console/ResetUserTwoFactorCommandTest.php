<?php

declare(strict_types=1);

use App\Models\User;

test('support can turn off a user\'s second factor by email', function () {
    $user = User::factory()->withTwoFactor()->create(['email' => 'ana@clini.test']);

    $this->artisan('user:reset-two-factor', ['email' => ' ANA@clini.test '])
        ->expectsConfirmation('¿Desactivar la verificación en dos pasos de este usuario?', 'yes')
        ->assertSuccessful();

    expect($user->fresh()?->hasTwoFactorEnabled())->toBeFalse()
        ->and($user->fresh()?->two_factor_secret)->toBeNull();
});

test('the reset fails for an unknown email or a user without the factor', function () {
    User::factory()->create(['email' => 'bruno@clini.test']);

    $this->artisan('user:reset-two-factor', ['email' => 'nadie@clini.test'])->assertFailed();

    $this->artisan('user:reset-two-factor', ['email' => 'bruno@clini.test'])
        ->expectsConfirmation('¿Desactivar la verificación en dos pasos de este usuario?', 'yes')
        ->assertFailed();
});

test('the reset finds an email stored with capitals, typed in any case', function () {
    $user = User::factory()->withTwoFactor()->create(['email' => 'Ana.Perez@Clini.test']);

    $this->artisan('user:reset-two-factor', ['email' => 'ana.perez@clini.test'])
        ->expectsConfirmation('¿Desactivar la verificación en dos pasos de este usuario?', 'yes')
        ->assertSuccessful();

    expect($user->fresh()?->hasTwoFactorEnabled())->toBeFalse();
});

test('the reset refuses an email that matches two accounts in different case', function () {
    $first = User::factory()->withTwoFactor()->create(['email' => 'Ana@clini.test']);
    $second = User::factory()->withTwoFactor()->create(['email' => 'ANA@clini.test']);

    $this->artisan('user:reset-two-factor', ['email' => 'ana@clini.test'])->assertFailed();

    expect($first->fresh()?->hasTwoFactorEnabled())->toBeTrue()
        ->and($second->fresh()?->hasTwoFactorEnabled())->toBeTrue();

    $this->artisan('user:reset-two-factor', ['email' => 'ANA@clini.test'])
        ->expectsConfirmation('¿Desactivar la verificación en dos pasos de este usuario?', 'yes')
        ->assertSuccessful();

    expect($first->fresh()?->hasTwoFactorEnabled())->toBeTrue()
        ->and($second->fresh()?->hasTwoFactorEnabled())->toBeFalse();
});
