<?php

declare(strict_types=1);

use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Models\AdminAuditLog;
use App\Models\PlatformAdmin;
use App\Models\User;
use Carbon\CarbonImmutable;

afterEach(function () {
    freshRequestState();
});

test('blocking persists the block and records one audit row', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-04 15:00:00', 'UTC'));
    $user = User::factory()->create(['email' => 'abuso@clini.test']);
    $admin = PlatformAdmin::factory()->create();

    actingAsAdmin($admin)->postJson("/api/v1/admin/users/{$user->id}/block", ['reason' => 'Uso indebido'])
        ->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.blocked_at', '2026-10-04T15:00:00+00:00')
        ->assertJsonPath('data.block_reason', 'Uso indebido')
        ->assertJsonStructure(['data' => ['memberships', 'memberships_count']]);

    expect($user->fresh()?->blocked_at?->toIso8601String())->toBe('2026-10-04T15:00:00+00:00');

    $log = AdminAuditLog::query()->sole();
    expect($log->action)->toBe(AdminAuditAction::UserBlocked);
    expect($log->subject_type)->toBe(AdminAuditSubject::User);
    expect($log->subject_id)->toBe($user->id);
    expect($log->platform_admin_id)->toBe($admin->id);
    expect($log->metadata)->toEqual(['subject_label' => 'abuso@clini.test', 'reason' => 'Uso indebido']);
});

test('blocking an already blocked user is a 409 and writes no audit row', function () {
    $user = User::factory()->create();
    $user->forceFill(['blocked_at' => now(), 'block_reason' => 'Anterior'])->save();

    actingAsAdmin()->postJson("/api/v1/admin/users/{$user->id}/block", ['reason' => 'Otra vez'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'users.already_blocked');

    expect(AdminAuditLog::query()->count())->toBe(0);
});

test('the block reason is required', function () {
    $user = User::factory()->create();

    actingAsAdmin()->postJson("/api/v1/admin/users/{$user->id}/block", ['reason' => ' '])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['reason']);

    expect($user->fresh()?->blocked_at)->toBeNull();
});

test('unblocking clears the block and keeps the previous one in the audit row', function () {
    $user = User::factory()->create(['email' => 'vuelve@clini.test']);
    $user->forceFill(['blocked_at' => CarbonImmutable::parse('2026-09-01 10:00:00', 'UTC'), 'block_reason' => 'Spam'])->save();

    actingAsAdmin()->deleteJson("/api/v1/admin/users/{$user->id}/block")
        ->assertOk()
        ->assertJsonPath('data.blocked_at', null)
        ->assertJsonPath('data.block_reason', null);

    expect($user->fresh()?->blocked_at)->toBeNull();

    $log = AdminAuditLog::query()->sole();
    expect($log->action)->toBe(AdminAuditAction::UserUnblocked);
    expect($log->metadata)->toEqual([
        'subject_label' => 'vuelve@clini.test',
        'previous_blocked_at' => '2026-09-01T10:00:00+00:00',
        'previous_reason' => 'Spam',
    ]);
});

test('unblocking a user who is not blocked is a 409', function () {
    $user = User::factory()->create();

    actingAsAdmin()->deleteJson("/api/v1/admin/users/{$user->id}/block")
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'users.not_blocked');

    expect(AdminAuditLog::query()->count())->toBe(0);
});
