<?php

declare(strict_types=1);

use App\Actions\Auth\SendPasswordResetLinkAction;
use App\Data\Auth\PasswordResetLinkRecipientData;
use App\Enums\ErrorCode;
use App\Mail\Auth\PasswordResetMail;
use App\Models\User;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Defer\DeferredCallbackCollection;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use PragmaRX\Google2FA\Google2FA;

const RESET_PASSWORD = 'una-clave-recuperada-larga';

beforeEach(function () {
    Mail::fake();
});

afterEach(function () {
    Date::setTestNow();
    freshRequestState();
});

function askForResetLink(string $email): TestResponse
{
    return fromPanel()->postJson('/api/v1/password-reset-links', ['email' => $email]);
}

/**
 * The token the last queued reset mail carries, from its link.
 */
function mailedResetToken(): string
{
    $token = null;

    Mail::assertQueued(PasswordResetMail::class, function (PasswordResetMail $mail) use (&$token): bool {
        $token = Str::afterLast($mail->resetUrl, '/');

        return true;
    });

    return (string) $token;
}

/**
 * @param  array<string, mixed>  $overrides
 */
function resetPassword(string $email, string $token, array $overrides = []): TestResponse
{
    return fromPanel()->postJson('/api/v1/password-resets', [
        'email' => $email,
        'token' => $token,
        'password' => RESET_PASSWORD,
        'password_confirmation' => RESET_PASSWORD,
        ...$overrides,
    ]);
}

test('asking for a link mails a single-use link to the panel\'s reset page, with the token alone', function () {
    $user = User::factory()->create(['name' => 'Ana Pérez', 'email' => 'ana@example.com']);

    askForResetLink('ana@example.com')->assertStatus(202)->assertContent('');

    Mail::assertQueuedCount(1);
    Mail::assertQueued(PasswordResetMail::class, function (PasswordResetMail $mail) use ($user): bool {
        return $mail->hasTo($user->email)
            && $mail->name === 'Ana Pérez'
            && str_starts_with($mail->resetUrl, 'http://localhost:5174/restablecer-contrasena/')
            && ! str_contains($mail->resetUrl, 'ana');
    });

    // Only the token's hash is kept.
    $stored = DB::table('password_reset_tokens')->where('email', 'ana@example.com')->value('token');
    expect($stored)->not->toBe(mailedResetToken())
        ->and(Hash::check(mailedResetToken(), (string) $stored))->toBeTrue();
});

test('an address without an account gets the same answer and no mail', function () {
    User::factory()->create(['email' => 'ana@example.com']);

    $known = askForResetLink('ana@example.com');
    $unknown = askForResetLink('nadie@example.com');

    expect($unknown->status())->toBe($known->status())
        ->and($unknown->getContent())->toBe($known->getContent());
    Mail::assertQueuedCount(1);
    expect(DB::table('password_reset_tokens')->where('email', 'nadie@example.com')->exists())->toBeFalse();
});

test('a second link within a minute gets the same answer and no mail', function () {
    User::factory()->create(['email' => 'ana@example.com']);

    askForResetLink('ana@example.com')->assertStatus(202);
    askForResetLink('ana@example.com')->assertStatus(202)->assertContent('');

    Mail::assertQueuedCount(1);
});

test('asking for links is limited per address and IP', function () {
    foreach (range(1, 5) as $ignored) {
        askForResetLink('ana@example.com')->assertStatus(202);
    }

    askForResetLink('ana@example.com')->assertTooManyRequests();
    askForResetLink(' ANA@example.com ')->assertTooManyRequests();
    askForResetLink('otra@example.com')->assertStatus(202);
});

test('asking for links is limited per IP across addresses within an hour', function () {
    foreach (range(1, 20) as $attempt) {
        askForResetLink("persona{$attempt}@example.com")->assertStatus(202);
    }

    askForResetLink('persona21@example.com')->assertTooManyRequests();
});

test('the link sets the new password, can\'t be used twice and signs nobody in', function () {
    $user = User::factory()->create(['email' => 'ana@example.com']);
    askForResetLink('ana@example.com');
    $token = mailedResetToken();

    resetPassword('ana@example.com', $token)->assertNoContent();

    $user->refresh();
    expect(Hash::check(RESET_PASSWORD, $user->password))->toBeTrue()
        ->and(DB::table('password_reset_tokens')->where('email', 'ana@example.com')->exists())->toBeFalse();

    freshRequestState();
    fromPanel()->getJson('/api/v1/me')->assertUnauthorized();

    resetPassword('ana@example.com', $token, ['password' => 'y-otra-clave-larga', 'password_confirmation' => 'y-otra-clave-larga'])
        ->assertNotFound()
        ->assertJsonPath('error.code', ErrorCode::AuthPasswordResetInvalidOrExpired->value);
    expect(Hash::check(RESET_PASSWORD, $user->refresh()->password))->toBeTrue();

    // The new password logs in.
    fromPanel()->postJson('/api/v1/login', ['email' => 'ana@example.com', 'password' => RESET_PASSWORD])->assertOk();
});

test('a wrong token, another address or an expired link all answer alike and change nothing', function (Closure $attempt) {
    $user = User::factory()->create(['email' => 'ana@example.com']);
    User::factory()->create(['email' => 'beto@example.com']);
    askForResetLink('ana@example.com');
    $token = mailedResetToken();

    $attempt($token)
        ->assertNotFound()
        ->assertExactJson(['error' => [
            'code' => ErrorCode::AuthPasswordResetInvalidOrExpired->value,
            'message' => 'The password reset link is invalid or has expired.',
            'context' => [],
        ]]);

    expect(Hash::check('password', $user->refresh()->password))->toBeTrue();
})->with([
    'wrong token' => [fn (string $token): TestResponse => resetPassword('ana@example.com', strrev($token))],
    'address with an account but another token' => [fn (string $token): TestResponse => resetPassword('beto@example.com', $token)],
    'address without an account' => [fn (string $token): TestResponse => resetPassword('nadie@example.com', $token)],
    'expired after 60 minutes' => [function (string $token): TestResponse {
        Date::setTestNow(now()->addMinutes(61));

        return resetPassword('ana@example.com', $token);
    }],
]);

test('resetting ends every session of the account', function () {
    $user = User::factory()->create(['email' => 'ana@example.com']);
    fromPanel()->postJson('/api/v1/login', ['email' => 'ana@example.com', 'password' => 'password'])->assertOk();
    fromPanel()->getJson('/api/v1/me')->assertOk();
    $openSession = app('session.store')->all();
    freshRequestState();

    // Someone else, with no session, resets it.
    app('session.store')->flush();
    askForResetLink('ana@example.com');
    resetPassword('ana@example.com', mailedResetToken())->assertNoContent();
    freshRequestState();

    app('session.store')->flush();
    $this->withSession($openSession);
    fromPanel()->getJson('/api/v1/me')->assertUnauthorized();
    expect($user->refresh()->remember_token)->not->toBeNull();
});

test('with the second factor on, logging in after a reset still asks for the code', function () {
    $user = User::factory()->create(['email' => 'ana@example.com']);
    $user->forceFill([
        'two_factor_secret' => (new Google2FA)->generateSecretKey(),
        'two_factor_confirmed_at' => now(),
    ])->save();
    askForResetLink('ana@example.com');

    resetPassword('ana@example.com', mailedResetToken())->assertNoContent();

    fromPanel()->postJson('/api/v1/login', ['email' => 'ana@example.com', 'password' => RESET_PASSWORD])
        ->assertOk()
        ->assertExactJson(['two_factor' => true]);
    fromPanel()->getJson('/api/v1/me')->assertUnauthorized();
});

test('a script on the dashboard origin can use neither endpoint', function () {
    User::factory()->create(['email' => 'ana@example.com']);

    fromDashboard()->postJson('/api/v1/password-reset-links', ['email' => 'ana@example.com'])->assertForbidden();
    fromDashboard()->postJson('/api/v1/password-resets', [
        'email' => 'ana@example.com',
        'token' => 'cualquiera',
        'password' => RESET_PASSWORD,
        'password_confirmation' => RESET_PASSWORD,
    ])->assertForbidden();

    Mail::assertNothingQueued();
});

test('the link is looked up and mailed only once the response is out, so its time never tells an account apart', function () {
    User::factory()->create(['email' => 'ana@example.com']);

    app(SendPasswordResetLinkAction::class)->handle(new PasswordResetLinkRecipientData('ana@example.com'));

    Mail::assertNothingQueued();
    expect(DB::table('password_reset_tokens')->exists())->toBeFalse();

    app(DeferredCallbackCollection::class)->invoke();

    Mail::assertQueuedCount(1);
});

test('expired reset tokens are cleared daily', function () {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn (Event $event): bool => str_contains((string) $event->command, 'auth:clear-resets'));

    expect($events)->toHaveCount(1)
        ->and($events->sole()->expression)->toBe('0 0 * * *');
});

test('the mail is in Spanish and links to the reset page', function () {
    $html = (new PasswordResetMail('Ana Pérez', 'https://panel.example/restablecer-contrasena/abc'))->render();

    expect($html)
        ->toContain('Hola Ana Pérez,')
        ->toContain('href="https://panel.example/restablecer-contrasena/abc"')
        ->toContain('vence en 60 minutos y solo puede usarse una vez');
});
