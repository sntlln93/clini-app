<?php

declare(strict_types=1);

use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Models\AdminAuditLog;
use App\Models\User;
use Carbon\CarbonImmutable;

afterEach(function () {
    freshRequestState();
});

test('verifying an email sets email_verified_at, clears the pending token and records an audit row', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-04 15:00:00', 'UTC'));
    $user = User::factory()->unverified()->create([
        'email' => 'pendiente@clini.test',
        'email_verification_token' => hash('sha256', 'token'),
        'email_verification_token_expires_at' => now()->addDay(),
    ]);

    actingAsAdmin()->postJson("/api/v1/admin/users/{$user->id}/email-verification")
        ->assertOk()
        ->assertJsonPath('data.email_verified_at', '2026-10-04T15:00:00+00:00');

    $user->refresh();
    expect($user->email_verified_at)->not->toBeNull();
    expect($user->email_verification_token)->toBeNull();
    expect($user->email_verification_token_expires_at)->toBeNull();

    $log = AdminAuditLog::query()->sole();
    expect($log->action)->toBe(AdminAuditAction::UserEmailVerified);
    expect($log->subject_type)->toBe(AdminAuditSubject::User);
    expect($log->subject_id)->toBe($user->id);
    expect($log->metadata)->toEqual(['subject_label' => 'pendiente@clini.test']);
});

test('verifying an already verified email is a 409 and writes no audit row', function () {
    $user = User::factory()->create();

    actingAsAdmin()->postJson("/api/v1/admin/users/{$user->id}/email-verification")
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'users.email_already_verified');

    expect(AdminAuditLog::query()->count())->toBe(0);
});
