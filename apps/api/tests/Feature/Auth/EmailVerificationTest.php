<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Mail\Auth\EmailVerificationMail;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

// Sanctum only boots the session for requests it recognizes as coming from
// the SPA (Origin/Referer matching SANCTUM_STATEFUL_DOMAINS) — a real
// browser always sends this cross-origin, so tests simulate it explicitly.
function registerFromSpaForVerification()
{
    return test()->withHeader('Referer', 'http://localhost:5174');
}

/**
 * Extracts the plaintext verification token from the URL carried by the
 * mailable — the only place, besides the user row's hash, where the raw
 * value ever exists.
 */
function tokenFromVerificationUrl(string $verificationUrl): string
{
    /** @var array<int, string> $segments */
    $segments = explode('/', rtrim($verificationUrl, '/'));

    return (string) end($segments);
}

function registerAndCaptureToken(): string
{
    registerFromSpaForVerification()->postJson('/api/v1/register', [
        'name' => 'Ana Owner',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => 'Clínica Norte',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ])->assertCreated();

    $capturedToken = null;
    Mail::assertQueued(EmailVerificationMail::class, function (EmailVerificationMail $mailable) use (&$capturedToken): bool {
        $capturedToken = tokenFromVerificationUrl($mailable->verificationUrl);

        return true;
    });

    return (string) $capturedToken;
}

test('registering queues the verification mail and persists a hashed token with a ~48h expiry', function () {
    Mail::fake();

    $response = registerFromSpaForVerification()->postJson('/api/v1/register', [
        'name' => 'Ana Owner',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => 'Clínica Norte',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ]);

    $response->assertCreated();

    Mail::assertQueued(EmailVerificationMail::class, function (EmailVerificationMail $mailable): bool {
        return $mailable->hasTo('ana@example.com');
    });

    Mail::assertNotSent(EmailVerificationMail::class);

    $user = User::where('email', 'ana@example.com')->firstOrFail();
    expect($user->email_verification_token)->not->toBeNull();
    expect($user->email_verification_token_expires_at)->not->toBeNull();
    expect($user->email_verification_token_expires_at->diffInMinutes(now()->addHours(48)))->toBeLessThan(5);
});

test('registering never persists the plaintext token, only its sha256 hash', function () {
    Mail::fake();

    $capturedToken = registerAndCaptureToken();

    $user = User::where('email', 'ana@example.com')->firstOrFail();
    expect($capturedToken)->not->toBeNull();
    expect($user->email_verification_token)->toBe(hash('sha256', $capturedToken));
    expect($user->email_verification_token)->not->toBe($capturedToken);
});

test('the register response body does not expose the verification token or its expiry', function () {
    Mail::fake();

    $response = registerFromSpaForVerification()->postJson('/api/v1/register', [
        'name' => 'Ana Owner',
        'email' => 'ana@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'organization_name' => 'Clínica Norte',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ]);

    $response->assertCreated();
    $response->assertJsonMissingPath('email_verification_token');
    $response->assertJsonMissingPath('email_verification_token_expires_at');
});

test('showing a valid verification token returns 200 and exposes only the expected key', function () {
    Mail::fake();
    $rawToken = registerAndCaptureToken();

    $response = $this->getJson('/api/v1/email-verification/'.$rawToken);

    $response->assertOk();
    expect(array_keys($response->json()))->toEqualCanonicalizing(['email']);
    expect($response->json('email'))->toBe('ana@example.com');
});

test('showing a valid verification token mutates nothing', function () {
    Mail::fake();
    $rawToken = registerAndCaptureToken();
    $user = User::where('email', 'ana@example.com')->firstOrFail();
    $tokenHashBefore = $user->email_verification_token;
    $expiresAtBefore = $user->email_verification_token_expires_at;

    $this->getJson('/api/v1/email-verification/'.$rawToken)->assertOk();

    $user->refresh();
    expect($user->email_verified_at)->toBeNull();
    expect($user->email_verification_token)->toBe($tokenHashBefore);
    expect($user->email_verification_token_expires_at)->toEqual($expiresAtBefore);
});

test('showing an unknown verification token returns the domain error', function () {
    $response = $this->getJson('/api/v1/email-verification/'.Str::random(40));

    $response->assertStatus(404);
    $response->assertJsonPath('error.code', ErrorCode::AuthEmailVerificationInvalidOrExpired->value);
});

test('showing an expired verification token returns the domain error', function () {
    $rawToken = Str::random(40);
    User::factory()->create([
        'email_verified_at' => null,
        'email_verification_token' => hash('sha256', $rawToken),
        'email_verification_token_expires_at' => now()->subHour(),
    ]);

    $response = $this->getJson('/api/v1/email-verification/'.$rawToken);

    $response->assertStatus(404);
    $response->assertJsonPath('error.code', ErrorCode::AuthEmailVerificationInvalidOrExpired->value);
});

test('confirming with a valid token verifies the email, clears both columns, and returns 200', function () {
    Mail::fake();
    $rawToken = registerAndCaptureToken();

    $response = $this->postJson('/api/v1/email-verification/'.$rawToken);

    $response->assertOk();

    $user = User::where('email', 'ana@example.com')->firstOrFail();
    expect($user->email_verified_at)->not->toBeNull();
    expect($user->email_verification_token)->toBeNull();
    expect($user->email_verification_token_expires_at)->toBeNull();
});

test('confirming with a valid token authenticates the user', function () {
    Mail::fake();
    $rawToken = registerAndCaptureToken();

    $this->postJson('/api/v1/email-verification/'.$rawToken)->assertOk();

    // Within a single Pest test, the app container (and therefore the auth
    // guard) persists across chained HTTP calls, unlike two real requests
    // hitting a fresh process each. Forget the guard so /api/v1/me re-resolves
    // the user from the session by id, mirroring RegisterTest.php.
    Auth::forgetGuards();

    $me = $this->getJson('/api/v1/me');

    $me->assertOk();
    $me->assertJsonPath('email', 'ana@example.com');
});

test('a verification token is single use: the second confirmation fails and email_verified_at keeps its first value', function () {
    Mail::fake();
    $rawToken = registerAndCaptureToken();

    $this->postJson('/api/v1/email-verification/'.$rawToken)->assertOk();

    $verifiedAt = User::where('email', 'ana@example.com')->firstOrFail()->email_verified_at;
    expect($verifiedAt)->not->toBeNull();

    $secondResponse = $this->postJson('/api/v1/email-verification/'.$rawToken);

    $secondResponse->assertStatus(404);
    $secondResponse->assertJsonPath('error.code', ErrorCode::AuthEmailVerificationInvalidOrExpired->value);

    expect(User::where('email', 'ana@example.com')->firstOrFail()->email_verified_at)->toEqual($verifiedAt);
});

test('confirming with an expired token returns the domain error and leaves email_verified_at null', function () {
    $rawToken = Str::random(40);
    User::factory()->create([
        'email' => 'expired@example.com',
        'email_verified_at' => null,
        'email_verification_token' => hash('sha256', $rawToken),
        'email_verification_token_expires_at' => now()->subHour(),
    ]);

    $response = $this->postJson('/api/v1/email-verification/'.$rawToken);

    $response->assertStatus(404);
    $response->assertJsonPath('error.code', ErrorCode::AuthEmailVerificationInvalidOrExpired->value);

    expect(User::where('email', 'expired@example.com')->firstOrFail()->email_verified_at)->toBeNull();
});

test('unknown, expired, and already-used tokens are indistinguishable in the response body', function () {
    Mail::fake();

    $unknownResponse = $this->postJson('/api/v1/email-verification/'.Str::random(40));

    $expiredToken = Str::random(40);
    User::factory()->create([
        'email' => 'expired-user@example.com',
        'email_verified_at' => null,
        'email_verification_token' => hash('sha256', $expiredToken),
        'email_verification_token_expires_at' => now()->subHour(),
    ]);
    $expiredResponse = $this->postJson('/api/v1/email-verification/'.$expiredToken);

    $usedToken = registerAndCaptureToken();
    $this->postJson('/api/v1/email-verification/'.$usedToken)->assertOk();
    $alreadyUsedResponse = $this->postJson('/api/v1/email-verification/'.$usedToken);

    expect($unknownResponse->status())->toBe(404);
    expect($expiredResponse->status())->toBe(404);
    expect($alreadyUsedResponse->status())->toBe(404);

    expect($unknownResponse->json())->toEqual($expiredResponse->json());
    expect($expiredResponse->json())->toEqual($alreadyUsedResponse->json());
});
