<?php

declare(strict_types=1);

use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Models\AdminAuditLog;
use App\Models\Organization;
use App\Models\PlatformAdmin;
use Carbon\CarbonImmutable;

afterEach(function () {
    freshRequestState();
});

test('suspending persists the suspension and records one audit row', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-04 15:00:00', 'UTC'));
    $organization = Organization::factory()->create(['name' => 'Consultorio Moroso']);
    $admin = PlatformAdmin::factory()->create();

    $response = actingAsAdmin($admin)->postJson("/api/v1/admin/organizations/{$organization->id}/suspension", [
        'reason' => 'Deuda de tres meses',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.id', $organization->id)
        ->assertJsonPath('data.suspended_at', '2026-10-04T15:00:00+00:00')
        ->assertJsonPath('data.suspension_reason', 'Deuda de tres meses')
        ->assertJsonStructure(['data' => ['members', 'subscription', 'usage']]);

    $organization->refresh();
    expect($organization->suspended_at?->toIso8601String())->toBe('2026-10-04T15:00:00+00:00');
    expect($organization->suspension_reason)->toBe('Deuda de tres meses');

    $log = AdminAuditLog::query()->sole();
    expect($log->action)->toBe(AdminAuditAction::OrganizationSuspended);
    expect($log->subject_type)->toBe(AdminAuditSubject::Organization);
    expect($log->subject_id)->toBe($organization->id);
    expect($log->platform_admin_id)->toBe($admin->id);
    expect($log->ip)->toBe('127.0.0.1');
    expect($log->metadata)->toEqual(['subject_label' => 'Consultorio Moroso', 'reason' => 'Deuda de tres meses']);
});

test('suspending an already suspended organization is a 409 and writes no audit row', function () {
    $organization = Organization::factory()->create();
    $organization->forceFill(['suspended_at' => now(), 'suspension_reason' => 'Anterior'])->save();

    actingAsAdmin()->postJson("/api/v1/admin/organizations/{$organization->id}/suspension", ['reason' => 'Otra vez'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'organizations.already_suspended');

    expect(AdminAuditLog::query()->count())->toBe(0);
    expect($organization->fresh()?->suspension_reason)->toBe('Anterior');
});

test('the suspension reason is required, at least 3 and at most 500 characters', function (array $payload) {
    $organization = Organization::factory()->create();

    actingAsAdmin()->postJson("/api/v1/admin/organizations/{$organization->id}/suspension", $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors(['reason']);

    expect($organization->fresh()?->suspended_at)->toBeNull();
})->with([
    'missing' => [[]],
    'too short' => [['reason' => 'ab']],
    'too long' => [['reason' => str_repeat('a', 501)]],
]);

test('suspending an unknown organization is 404', function () {
    actingAsAdmin()->postJson('/api/v1/admin/organizations/999999/suspension', ['reason' => 'Deuda'])
        ->assertNotFound();
});

test('reactivating clears the suspension and keeps the previous one in the audit row', function () {
    $organization = Organization::factory()->create(['name' => 'Consultorio Vuelve']);
    $organization->forceFill([
        'suspended_at' => CarbonImmutable::parse('2026-09-01 10:00:00', 'UTC'),
        'suspension_reason' => 'Deuda',
    ])->save();

    actingAsAdmin()->deleteJson("/api/v1/admin/organizations/{$organization->id}/suspension")
        ->assertOk()
        ->assertJsonPath('data.suspended_at', null)
        ->assertJsonPath('data.suspension_reason', null);

    $organization->refresh();
    expect($organization->suspended_at)->toBeNull();
    expect($organization->suspension_reason)->toBeNull();

    $log = AdminAuditLog::query()->sole();
    expect($log->action)->toBe(AdminAuditAction::OrganizationReactivated);
    expect($log->metadata)->toEqual([
        'subject_label' => 'Consultorio Vuelve',
        'previous_suspended_at' => '2026-09-01T10:00:00+00:00',
        'previous_reason' => 'Deuda',
    ]);
});

test('reactivating an active organization is a 409 and writes no audit row', function () {
    $organization = Organization::factory()->create();

    actingAsAdmin()->deleteJson("/api/v1/admin/organizations/{$organization->id}/suspension")
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'organizations.not_suspended');

    expect(AdminAuditLog::query()->count())->toBe(0);
});
