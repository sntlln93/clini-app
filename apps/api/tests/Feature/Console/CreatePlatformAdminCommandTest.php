<?php

declare(strict_types=1);

use App\Models\PlatformAdmin;
use Illuminate\Support\Facades\Hash;

afterEach(function () {
    freshRequestState();
});

test('admin:create with options creates an operator with a hashed password', function () {
    $this->artisan('admin:create', [
        '--name' => 'Olivia Operadora',
        '--email' => 'olivia@clini.test',
        '--password' => 'una-clave-larga',
        '--no-interaction' => true,
    ])->expectsOutputToContain('Operador creado: olivia@clini.test')->assertSuccessful();

    $admin = PlatformAdmin::query()->sole();
    expect($admin->name)->toBe('Olivia Operadora');
    expect($admin->password)->not->toBe('una-clave-larga');
    expect(Hash::check('una-clave-larga', $admin->password))->toBeTrue();
});

test('admin:create prompts for missing values, the password twice', function () {
    $this->artisan('admin:create')
        ->expectsQuestion('Nombre', 'Pablo')
        ->expectsQuestion('Correo electrónico', 'pablo@clini.test')
        ->expectsQuestion('Contraseña', 'otra-clave-larga')
        ->expectsQuestion('Repetí la contraseña', 'otra-clave-larga')
        ->assertSuccessful();

    expect(PlatformAdmin::query()->where('email', 'pablo@clini.test')->exists())->toBeTrue();
});

test('admin:create fails when the password confirmation does not match', function () {
    $this->artisan('admin:create', ['--name' => 'Pablo', '--email' => 'pablo@clini.test'])
        ->expectsQuestion('Contraseña', 'otra-clave-larga')
        ->expectsQuestion('Repetí la contraseña', 'distinta-clave-larga')
        ->assertFailed();

    expect(PlatformAdmin::query()->count())->toBe(0);
});

test('admin:create rejects invalid input and creates nothing', function (array $options) {
    PlatformAdmin::factory()->create(['email' => 'existente@clini.test']);

    $this->artisan('admin:create', $options + ['--no-interaction' => true])->assertFailed();

    expect(PlatformAdmin::query()->count())->toBe(1);
})->with([
    'duplicate email' => [['--name' => 'X', '--email' => 'existente@clini.test', '--password' => 'una-clave-larga']],
    'duplicate email in another case' => [['--name' => 'X', '--email' => ' Existente@Clini.TEST ', '--password' => 'una-clave-larga']],
    'invalid email' => [['--name' => 'X', '--email' => 'no-es-un-correo', '--password' => 'una-clave-larga']],
    'short password' => [['--name' => 'X', '--email' => 'nuevo@clini.test', '--password' => 'corta']],
    'missing password without interaction' => [['--name' => 'X', '--email' => 'nuevo@clini.test']],
]);

test('the email is stored lowercased and the operator can log in with any casing', function () {
    $this->artisan('admin:create', [
        '--name' => 'Olivia',
        '--email' => '  Olivia@Clini.TEST ',
        '--password' => 'una-clave-larga',
        '--no-interaction' => true,
    ])->assertSuccessful();

    expect(PlatformAdmin::query()->sole()->email)->toBe('olivia@clini.test');

    fromDashboard()->postJson('/api/v1/admin/login', ['email' => 'OLIVIA@clini.test', 'password' => 'una-clave-larga'])
        ->assertOk()
        ->assertJsonPath('data.email', 'olivia@clini.test');
});
