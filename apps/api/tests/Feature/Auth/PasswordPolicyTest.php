<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Mail\Auth\PasswordResetMail;
use App\Models\MembershipInvitation;
use App\Models\Organization;
use App\Models\PlatformAdmin;
use App\Models\User;
use App\Support\PasswordPolicy;
use Illuminate\Contracts\Validation\UncompromisedVerifier;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Illuminate\Validation\NotPwnedVerifier;

// One rule wherever a password is chosen (#389): at least 12 characters, and none a known breach holds.

const ELEVEN_CHARACTERS = 'clave-corta';
const TWELVE_CHARACTERS = 'clave-justa-';
const BREACHED_PASSWORD = 'contraseña-filtrada-larga';

beforeEach(function () {
    Mail::fake();
});

afterEach(function () {
    freshRequestState();
});

/**
 * Each entry point that chooses a password: chooses `$password` and answers whether it was taken, and the message
 * about the password a refusal gave (null for `admin:create`, whose output another test reads).
 *
 * @return array<string, array{0: Closure(string): array{bool, ?string}}>
 */
function passwordEntryPoints(): array
{
    return [
        'register' => [function (string $password): array {
            $response = fromPanel()->postJson('/api/v1/register', [
                'name' => 'Ana',
                'email' => 'ana@example.com',
                'password' => $password,
                'password_confirmation' => $password,
                'organization_name' => 'Consultorio Ana',
                'timezone' => 'America/Argentina/Buenos_Aires',
            ]);

            return policyOutcome($response);
        }],
        'invitation acceptance' => [function (string $password): array {
            $token = Str::random(40);
            MembershipInvitation::factory()->create([
                'organization_id' => Organization::factory()->center()->create()->id,
                'email' => 'nueva@example.com',
                'roles' => [MembershipRole::Professional],
                'token' => hash('sha256', $token),
            ]);

            $response = fromPanel()->postJson("/api/v1/invitations/{$token}", [
                'name' => 'Nueva',
                'password' => $password,
                'password_confirmation' => $password,
            ]);

            return policyOutcome($response);
        }],
        'change' => [function (string $password): array {
            test()->actingAs(User::factory()->create(), 'web');

            $response = fromPanel()->putJson('/api/v1/me/password', [
                'current_password' => 'password',
                'password' => $password,
                'password_confirmation' => $password,
            ]);

            return policyOutcome($response);
        }],
        'reset' => [function (string $password): array {
            User::factory()->create(['email' => 'ana@example.com']);
            fromPanel()->postJson('/api/v1/password-reset-links', ['email' => 'ana@example.com'])->assertStatus(202);
            $token = '';
            Mail::assertQueued(PasswordResetMail::class, function (PasswordResetMail $mail) use (&$token): bool {
                $token = Str::afterLast($mail->resetUrl, '/');

                return true;
            });

            $response = fromPanel()->postJson('/api/v1/password-resets', [
                'email' => 'ana@example.com',
                'token' => $token,
                'password' => $password,
                'password_confirmation' => $password,
            ]);

            return policyOutcome($response);
        }],
        'admin:create' => [function (string $password): array {
            test()->artisan('admin:create', [
                '--name' => 'Olivia',
                '--email' => 'olivia@clini.test',
                '--password' => $password,
                '--no-interaction' => true,
            ])->run();

            $admin = PlatformAdmin::query()->where('email', 'olivia@clini.test')->first();

            return [$admin !== null && Hash::check($password, $admin->password), null];
        }],
    ];
}

/**
 * @return array{bool, ?string}
 */
function policyOutcome(TestResponse $response): array
{
    $passwordError = $response->status() === 422 ? $response->json('errors.password.0') : null;

    return [$response->status() < 300, is_string($passwordError) ? $passwordError : null];
}

dataset('password entry points', passwordEntryPoints());

test('a password of 12 characters missing from every breach is taken', function (Closure $choose) {
    expect($choose(TWELVE_CHARACTERS))->toBe([true, null]);
})->with('password entry points');

test('a password under 12 characters is refused', function (Closure $choose) {
    [$taken, $message] = $choose(ELEVEN_CHARACTERS);

    expect($taken)->toBeFalse()
        ->and($message)->toBeIn(['La contraseña debe tener al menos 12 caracteres.', null]);
})->with('password entry points');

test('a password a known breach holds is refused', function (Closure $choose) {
    $this->reportBreachedPassword(BREACHED_PASSWORD);

    [$taken, $message] = $choose(BREACHED_PASSWORD);

    expect($taken)->toBeFalse()
        ->and($message)->toBeIn(['Esta contraseña apareció en una filtración de datos de otro sitio. Elegí otra.', null]);
})->with('password entry points');

test('admin:create tells the operator why the password was refused, in Spanish', function () {
    $this->reportBreachedPassword(BREACHED_PASSWORD);

    $this->artisan('admin:create', ['--name' => 'O', '--email' => 'o@clini.test', '--password' => ELEVEN_CHARACTERS, '--no-interaction' => true])
        ->expectsOutputToContain('La contraseña debe tener al menos 12 caracteres.')
        ->assertFailed();
    $this->artisan('admin:create', ['--name' => 'O', '--email' => 'o@clini.test', '--password' => BREACHED_PASSWORD, '--no-interaction' => true])
        ->expectsOutputToContain('Esta contraseña apareció en una filtración de datos de otro sitio. Elegí otra.')
        ->assertFailed();
});

test('the breach check sends only the first five characters of the password\'s SHA-1', function () {
    fromPanel()->postJson('/api/v1/register', [
        'name' => 'Ana',
        'email' => 'ana@example.com',
        'password' => TWELVE_CHARACTERS,
        'password_confirmation' => TWELVE_CHARACTERS,
        'organization_name' => 'Consultorio Ana',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ])->assertCreated();

    $hash = strtoupper(sha1(TWELVE_CHARACTERS));

    Http::assertSent(fn (Request $request): bool => $request->url() === 'https://api.pwnedpasswords.com/range/'.substr($hash, 0, 5)
        && ! str_contains($request->url(), substr($hash, 5))
        && ! str_contains($request->url(), TWELVE_CHARACTERS));
});

test('an unreachable breach check lets the password through, after five seconds at most', function () {
    Http::swap(new Factory);
    Http::preventStrayRequests();
    Http::fake(['api.pwnedpasswords.com/*' => fn () => throw new ConnectionException('timed out')]);

    $verifier = app(UncompromisedVerifier::class);

    expect($verifier)->toBeInstanceOf(NotPwnedVerifier::class)
        ->and((fn (): int => $this->timeout)->call($verifier))->toBe(PasswordPolicy::BREACH_CHECK_TIMEOUT_SECONDS)
        ->and($verifier->verify(['value' => TWELVE_CHARACTERS, 'threshold' => 0]))->toBeTrue();
});

test('an older, shorter password still logs in', function () {
    $user = User::factory()->create(['password' => 'corta']);

    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'corta'])->assertOk();
});
