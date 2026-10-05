<?php

declare(strict_types=1);

use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Enums\SubscriptionStatus;
use App\Models\AdminAuditLog;
use App\Models\Organization;
use App\Models\PlatformAdmin;
use App\Models\Subscription;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Schema;

afterEach(function () {
    freshRequestState();
});

/**
 * @param  array<string, mixed>  $attributes
 */
function auditRow(PlatformAdmin $admin, AdminAuditAction $action, string $createdAtUtc, array $attributes = []): AdminAuditLog
{
    $log = AdminAuditLog::factory()->create($attributes + [
        'platform_admin_id' => $admin->id,
        'action' => $action,
    ]);
    $log->forceFill(['created_at' => CarbonImmutable::parse($createdAtUtc, 'UTC')])->save();

    return $log;
}

test('audit rows are listed newest first with the operator ref and subject', function () {
    $admin = PlatformAdmin::factory()->create(['name' => 'Olivia', 'email' => 'olivia@clini.test']);
    auditRow($admin, AdminAuditAction::AuthLogin, '2026-10-01 10:00:00');
    $suspend = auditRow($admin, AdminAuditAction::OrganizationSuspended, '2026-10-02 10:00:00', [
        'subject_type' => AdminAuditSubject::Organization,
        'subject_id' => 42,
        'metadata' => ['subject_label' => 'Consultorio', 'reason' => 'Deuda'],
    ]);

    $response = actingAsAdmin()->getJson('/api/v1/admin/audit-logs');

    $response->assertOk();
    expect($response->json('data.0'))->toBe([
        'id' => $suspend->id,
        'action' => 'organizations.suspend',
        'platform_admin' => ['id' => $admin->id, 'name' => 'Olivia', 'email' => 'olivia@clini.test'],
        'subject' => ['type' => 'organization', 'id' => 42, 'label' => 'Consultorio'],
        'metadata' => ['reason' => 'Deuda', 'subject_label' => 'Consultorio'],
        'ip' => '127.0.0.1',
        'created_at' => '2026-10-02T10:00:00+00:00',
    ]);
    expect($response->json('data.1.subject'))->toBeNull();
    expect($response->getContent())->toContain('"metadata":{}');
});

test('audit rows filter by action, operator, subject type, subject and local date range', function () {
    $olivia = PlatformAdmin::factory()->create();
    $pablo = PlatformAdmin::factory()->create();
    $login = auditRow($olivia, AdminAuditAction::AuthLogin, '2026-10-01 12:00:00');
    $block = auditRow($pablo, AdminAuditAction::UserBlocked, '2026-10-02 12:00:00', ['subject_type' => AdminAuditSubject::User, 'subject_id' => 7]);
    $unblock = auditRow($pablo, AdminAuditAction::UserUnblocked, '2026-10-03 12:00:00', ['subject_type' => AdminAuditSubject::User, 'subject_id' => 8]);
    // 02:00 UTC on Oct 4 = 23:00 on Oct 3 in Buenos Aires.
    $lateNight = auditRow($olivia, AdminAuditAction::OrganizationSuspended, '2026-10-04 02:00:00', ['subject_type' => AdminAuditSubject::Organization, 'subject_id' => 7]);

    $ids = fn (string $query): array => array_column(actingAsAdmin()->getJson('/api/v1/admin/audit-logs?'.$query)->json('data'), 'id');

    expect($ids('action=users.block'))->toBe([$block->id]);
    freshRequestState();
    expect($ids("platform_admin_id={$olivia->id}"))->toBe([$lateNight->id, $login->id]);
    freshRequestState();
    expect($ids('subject_type=user'))->toBe([$unblock->id, $block->id]);
    freshRequestState();
    expect($ids('subject_type=user&subject_id=7'))->toBe([$block->id]);
    freshRequestState();
    expect($ids('from=2026-10-02&to=2026-10-03'))->toBe([$lateNight->id, $unblock->id, $block->id]);
    freshRequestState();
    expect($ids('to=2026-10-01'))->toBe([$login->id]);
});

test('subject_id without subject_type, an unknown action or operator are 422', function (string $query, string $field) {
    actingAsAdmin()->getJson('/api/v1/admin/audit-logs?'.$query)
        ->assertStatus(422)
        ->assertJsonValidationErrors([$field]);
})->with([
    'subject_id alone' => ['subject_id=3', 'subject_type'],
    'unknown action' => ['action=users.delete', 'action'],
    'unknown operator' => ['platform_admin_id=999999', 'platform_admin_id'],
    'to before from' => ['from=2026-10-05&to=2026-10-01', 'to'],
]);

test('the audit table is append-only: no updated_at column', function () {
    expect(Schema::hasColumn('admin_audit_logs', 'created_at'))->toBeTrue();
    expect(Schema::hasColumn('admin_audit_logs', 'updated_at'))->toBeFalse();
});

test('every mutating operator endpoint writes exactly one audit row with the right action and subject', function (string $method, string $template, array $payload, AdminAuditAction $action, ?AdminAuditSubject $subject) {
    $this->travelTo(CarbonImmutable::parse('2026-10-04 15:00:00', 'UTC'));
    $organization = Organization::factory()->create();
    $organization->forceFill($template === 'reactivate' ? ['suspended_at' => now(), 'suspension_reason' => 'Deuda'] : [])->save();
    $user = User::factory()->unverified()->create();
    $user->forceFill($template === 'unblock' ? ['blocked_at' => now(), 'block_reason' => 'Spam'] : [])->save();
    $subscription = Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create(['organization_id' => $organization->id]);
    $admin = PlatformAdmin::factory()->create();

    $uris = [
        'suspend' => "/api/v1/admin/organizations/{$organization->id}/suspension",
        'reactivate' => "/api/v1/admin/organizations/{$organization->id}/suspension",
        'block' => "/api/v1/admin/users/{$user->id}/block",
        'unblock' => "/api/v1/admin/users/{$user->id}/block",
        'verify' => "/api/v1/admin/users/{$user->id}/email-verification",
        'grace' => "/api/v1/admin/subscriptions/{$subscription->id}/grace-extension",
        'logout' => '/api/v1/admin/logout',
    ];
    $subjectIds = [
        'organization' => $organization->id,
        'user' => $user->id,
        'subscription' => $subscription->id,
    ];

    actingAsAdmin($admin)->json($method, $uris[$template], $payload)->assertSuccessful();

    $log = AdminAuditLog::query()->sole();
    expect($log->action)->toBe($action);
    expect($log->platform_admin_id)->toBe($admin->id);
    expect($log->subject_type)->toBe($subject);
    expect($log->subject_id)->toBe($subject === null ? null : $subjectIds[$subject->value]);
})->with([
    'suspend' => ['post', 'suspend', ['reason' => 'Deuda'], AdminAuditAction::OrganizationSuspended, AdminAuditSubject::Organization],
    'reactivate' => ['delete', 'reactivate', [], AdminAuditAction::OrganizationReactivated, AdminAuditSubject::Organization],
    'block' => ['post', 'block', ['reason' => 'Spam'], AdminAuditAction::UserBlocked, AdminAuditSubject::User],
    'unblock' => ['delete', 'unblock', [], AdminAuditAction::UserUnblocked, AdminAuditSubject::User],
    'verify email' => ['post', 'verify', [], AdminAuditAction::UserEmailVerified, AdminAuditSubject::User],
    'extend grace' => ['post', 'grace', ['grace_ends_on' => '2026-10-10'], AdminAuditAction::SubscriptionGraceExtended, AdminAuditSubject::Subscription],
    'logout' => ['post', 'logout', [], AdminAuditAction::AuthLogout, null],
]);
