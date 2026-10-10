<?php

declare(strict_types=1);

use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Enums\Plan;
use App\Enums\SubscriptionStatus;
use App\Models\AdminAuditLog;
use App\Models\Organization;
use App\Models\PlatformAdmin;
use App\Models\Subscription;

afterEach(function () {
    freshRequestState();
});

test('assigning Center persists it, reports the plan and records one audit row', function () {
    $organization = Organization::factory()->create(['name' => 'Centro Médico Sur']);
    $admin = PlatformAdmin::factory()->create();

    actingAsAdmin($admin)->putJson("/api/v1/admin/organizations/{$organization->id}/plan", [
        'assigned_plan' => 'center',
        'reason' => 'Contrato firmado',
    ])->assertOk()
        ->assertJsonPath('data.plan', 'center')
        ->assertJsonPath('data.assigned_plan', 'center');

    expect($organization->fresh()?->assigned_plan)->toBe(Plan::Center);

    $log = AdminAuditLog::query()->sole();
    expect($log->action)->toBe(AdminAuditAction::OrganizationPlanAssigned);
    expect($log->subject_type)->toBe(AdminAuditSubject::Organization);
    expect($log->subject_id)->toBe($organization->id);
    expect($log->platform_admin_id)->toBe($admin->id);
    expect($log->metadata)->toEqual([
        'subject_label' => 'Centro Médico Sur',
        'previous_assigned_plan' => null,
        'assigned_plan' => 'center',
        'reason' => 'Contrato firmado',
    ]);
});

test('removing Center returns the organization to its subscription, Free without one', function () {
    $organization = Organization::factory()->center()->create();

    actingAsAdmin()->putJson("/api/v1/admin/organizations/{$organization->id}/plan", ['assigned_plan' => null, 'reason' => 'Fin del contrato'])
        ->assertOk()
        ->assertJsonPath('data.plan', 'free')
        ->assertJsonPath('data.assigned_plan', null);

    expect(AdminAuditLog::query()->sole()->metadata)->toMatchArray(['previous_assigned_plan' => 'center', 'assigned_plan' => null]);
});

test('an assignment that changes nothing is a 409 and writes no audit row', function (?string $current, ?string $requested) {
    $organization = Organization::factory()->create();
    $organization->forceFill(['assigned_plan' => $current])->save();

    actingAsAdmin()->putJson("/api/v1/admin/organizations/{$organization->id}/plan", ['assigned_plan' => $requested, 'reason' => 'Sin cambios'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'plans.assignment_unchanged');

    expect(AdminAuditLog::query()->count())->toBe(0);
})->with([
    'already center' => ['center', 'center'],
    'nothing to remove' => [null, null],
]);

test('Center is refused while the subscription can still charge', function (SubscriptionStatus $status) {
    $organization = Organization::factory()->create();
    Subscription::factory()->withStatus($status)->create(['organization_id' => $organization->id]);

    actingAsAdmin()->putJson("/api/v1/admin/organizations/{$organization->id}/plan", ['assigned_plan' => 'center', 'reason' => 'Contrato'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'plans.subscription_live')
        ->assertJsonPath('error.context.subscription_status', $status->value);

    expect($organization->fresh()?->assigned_plan)->toBeNull();
    expect(AdminAuditLog::query()->count())->toBe(0);
})->with([SubscriptionStatus::Active, SubscriptionStatus::Grace, SubscriptionStatus::Expired]);

test('Center is assignable once the subscription can no longer charge', function (SubscriptionStatus $status) {
    $organization = Organization::factory()->create();
    Subscription::factory()->withStatus($status)->create(['organization_id' => $organization->id]);

    actingAsAdmin()->putJson("/api/v1/admin/organizations/{$organization->id}/plan", ['assigned_plan' => 'center', 'reason' => 'Contrato'])
        ->assertOk();
})->with([SubscriptionStatus::Cancelled, SubscriptionStatus::Pending]);

test('the plan and the reason are validated', function (array $payload, string $field) {
    $organization = Organization::factory()->create();

    actingAsAdmin()->putJson("/api/v1/admin/organizations/{$organization->id}/plan", $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors($field);
})->with([
    'practice is not assignable' => [['assigned_plan' => 'practice', 'reason' => 'Regalo'], 'assigned_plan'],
    'free is not assignable' => [['assigned_plan' => 'free', 'reason' => 'Regalo'], 'assigned_plan'],
    'the plan key is required' => [['reason' => 'Contrato'], 'assigned_plan'],
    'missing reason' => [['assigned_plan' => 'center'], 'reason'],
    'short reason' => [['assigned_plan' => 'center', 'reason' => 'no'], 'reason'],
]);

test('the organization list and detail report the effective plan', function () {
    $organization = Organization::factory()->create(['name' => 'Consultorio Pago']);
    Subscription::factory()->create(['organization_id' => $organization->id]);

    actingAsAdmin()->getJson("/api/v1/admin/organizations/{$organization->id}")
        ->assertOk()->assertJsonPath('data.plan', 'practice')->assertJsonPath('data.assigned_plan', null);
    expect(actingAsAdmin()->getJson('/api/v1/admin/organizations')->json('data.0.plan'))->toBe('practice');
});
