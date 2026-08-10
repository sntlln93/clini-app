<?php

declare(strict_types=1);

use App\Actions\Auth\FindValidEmailVerificationUserAction;
use App\Data\Auth\EmailVerificationData;
use App\Exceptions\Auth\EmailVerificationInvalidOrExpiredException;
use App\Models\User;
use Illuminate\Support\Str;

test('returns the user whose token matches the sha256 of the DTO token when the expiry is in the future', function () {
    $rawToken = Str::random(40);
    $user = User::factory()->create([
        'email_verification_token' => hash('sha256', $rawToken),
        'email_verification_token_expires_at' => now()->addHour(),
    ]);

    $found = app(FindValidEmailVerificationUserAction::class)->handle(new EmailVerificationData(token: $rawToken));

    expect($found->id)->toBe($user->id);
});

test('throws when no user matches the token', function () {
    app(FindValidEmailVerificationUserAction::class)->handle(new EmailVerificationData(token: Str::random(40)));
})->throws(EmailVerificationInvalidOrExpiredException::class);

test('throws when the matching user has a null expiry', function () {
    $rawToken = Str::random(40);
    User::factory()->create([
        'email_verification_token' => hash('sha256', $rawToken),
        'email_verification_token_expires_at' => null,
    ]);

    app(FindValidEmailVerificationUserAction::class)->handle(new EmailVerificationData(token: $rawToken));
})->throws(EmailVerificationInvalidOrExpiredException::class);

test('throws when the expiry is in the past', function () {
    $rawToken = Str::random(40);
    User::factory()->create([
        'email_verification_token' => hash('sha256', $rawToken),
        'email_verification_token_expires_at' => now()->subHour(),
    ]);

    app(FindValidEmailVerificationUserAction::class)->handle(new EmailVerificationData(token: $rawToken));
})->throws(EmailVerificationInvalidOrExpiredException::class);
