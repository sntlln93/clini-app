<?php

declare(strict_types=1);

use App\Enums\AdminAuditAction;
use App\Enums\AdminAuditSubject;
use App\Enums\ContactRequestStatus;
use App\Models\AdminAuditLog;
use App\Models\ContactRequest;
use App\Models\PlatformAdmin;
use Carbon\CarbonImmutable;

afterEach(function () {
    freshRequestState();
});

/**
 * @return list<int>
 */
function listedContactRequestIds(string $query = ''): array
{
    /** @var list<array{id: int}> $rows */
    $rows = actingAsAdmin()->getJson("/api/v1/admin/contact-requests?{$query}")->assertOk()->json('data');
    freshRequestState();

    return array_column($rows, 'id');
}

test('the list is paginated, newest first, with every field and who handled it', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-17 12:00:00', 'UTC'));
    $admin = PlatformAdmin::factory()->create(['name' => 'Olivia', 'email' => 'olivia@clini.test']);
    $older = ContactRequest::factory()->create(['created_at' => now()->subDay()]);
    $newer = ContactRequest::factory()->create([
        'name' => 'Laura Gómez',
        'email' => 'laura@centro.test',
        'phone' => '11 5555-0000',
        'organization_name' => 'Centro Médico Norte',
        'team_size' => 12,
        'plan' => 'center',
        'message' => 'Queremos migrar la agenda.',
        'status' => ContactRequestStatus::Closed,
        'handled_by_id' => $admin->id,
        'closed_at' => now(),
    ]);

    actingAsAdmin()->getJson('/api/v1/admin/contact-requests')
        ->assertOk()
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('meta.per_page', 15)
        ->assertJsonPath('data.0.id', $newer->id)
        ->assertJsonPath('data.1.id', $older->id)
        ->assertJsonPath('data.0', [
            'id' => $newer->id,
            'name' => 'Laura Gómez',
            'email' => 'laura@centro.test',
            'phone' => '11 5555-0000',
            'organization_name' => 'Centro Médico Norte',
            'team_size' => 12,
            'plan' => 'center',
            'message' => 'Queremos migrar la agenda.',
            'status' => 'closed',
            'handled_by' => ['id' => $admin->id, 'name' => 'Olivia', 'email' => 'olivia@clini.test'],
            'closed_at' => '2026-10-17T12:00:00+00:00',
            'created_at' => '2026-10-17T12:00:00+00:00',
            'updated_at' => '2026-10-17T12:00:00+00:00',
        ])
        ->assertJsonPath('data.1.handled_by', null);
});

test('the list filters by status', function () {
    $new = ContactRequest::factory()->create();
    $inProgress = ContactRequest::factory()->create(['status' => ContactRequestStatus::InProgress]);
    $closed = ContactRequest::factory()->closed()->create();

    expect(listedContactRequestIds('status=new'))->toBe([$new->id]);
    expect(listedContactRequestIds('status=in_progress'))->toBe([$inProgress->id]);
    expect(listedContactRequestIds('status=closed'))->toBe([$closed->id]);
});

test('an unknown status filter is a 422', function () {
    actingAsAdmin()->getJson('/api/v1/admin/contact-requests?status=archived')
        ->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});

test('changing the status records the operator and one audit row without personal data', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-17 12:00:00', 'UTC'));
    $admin = PlatformAdmin::factory()->create(['name' => 'Olivia', 'email' => 'olivia@clini.test']);
    $request = ContactRequest::factory()->create(['email' => 'laura@centro.test']);

    actingAsAdmin($admin)->putJson("/api/v1/admin/contact-requests/{$request->id}/status", ['status' => 'in_progress'])
        ->assertOk()
        ->assertJsonPath('data.status', 'in_progress')
        ->assertJsonPath('data.handled_by.id', $admin->id)
        ->assertJsonPath('data.closed_at', null);

    $log = AdminAuditLog::query()->sole();
    expect($log->action)->toBe(AdminAuditAction::ContactRequestStatusChanged);
    expect($log->subject_type)->toBe(AdminAuditSubject::ContactRequest);
    expect($log->subject_id)->toBe($request->id);
    expect($log->platform_admin_id)->toBe($admin->id);
    expect($log->metadata)->toEqual([
        'subject_label' => "Consulta #{$request->id}",
        'from' => 'new',
        'to' => 'in_progress',
    ]);
});

test('closing stamps closed_at and reopening clears it', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-17 12:00:00', 'UTC'));
    $request = ContactRequest::factory()->create();

    actingAsAdmin()->putJson("/api/v1/admin/contact-requests/{$request->id}/status", ['status' => 'closed'])
        ->assertOk()
        ->assertJsonPath('data.closed_at', '2026-10-17T12:00:00+00:00');
    freshRequestState();

    actingAsAdmin()->putJson("/api/v1/admin/contact-requests/{$request->id}/status", ['status' => 'new'])
        ->assertOk()
        ->assertJsonPath('data.status', 'new')
        ->assertJsonPath('data.closed_at', null);

    expect(AdminAuditLog::query()->count())->toBe(2);
});

test('setting the status the request already has is a 409 and writes no audit row', function () {
    $request = ContactRequest::factory()->create(['status' => ContactRequestStatus::InProgress]);

    actingAsAdmin()->putJson("/api/v1/admin/contact-requests/{$request->id}/status", ['status' => 'in_progress'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'contact_requests.status_unchanged');

    expect(AdminAuditLog::query()->count())->toBe(0);
    expect($request->fresh()?->handled_by_id)->toBeNull();
});

test('a missing or unknown status is a 422', function (array $payload) {
    $request = ContactRequest::factory()->create();

    actingAsAdmin()->putJson("/api/v1/admin/contact-requests/{$request->id}/status", $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
})->with([
    'missing' => [[]],
    'unknown' => [['status' => 'archived']],
]);

test('an unknown request is a 404', function () {
    actingAsAdmin()->putJson('/api/v1/admin/contact-requests/999999/status', ['status' => 'closed'])
        ->assertNotFound();
});

test('the audit log filters by the contact request subject', function () {
    $request = ContactRequest::factory()->create();
    actingAsAdmin()->putJson("/api/v1/admin/contact-requests/{$request->id}/status", ['status' => 'closed'])->assertOk();
    freshRequestState();

    actingAsAdmin()->getJson("/api/v1/admin/audit-logs?subject_type=contact_request&subject_id={$request->id}")
        ->assertOk()
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.subject', [
            'type' => 'contact_request',
            'id' => $request->id,
            'label' => "Consulta #{$request->id}",
        ]);
});
