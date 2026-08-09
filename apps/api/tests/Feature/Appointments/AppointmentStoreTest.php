<?php

declare(strict_types=1);

use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Enums\ErrorCode;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\ProfessionalService;
use App\Models\Service;
use App\Models\User;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

// See the last test in this file for why this cleanup is needed. Named
// distinctly from PatientStoreTest's own raceCleanupTasks() since Pest
// loads every test file's top-level functions into the same global namespace.
function &appointmentRaceCleanupTasks(): array
{
    static $tasks = [];

    return $tasks;
}

afterAll(function () {
    foreach (appointmentRaceCleanupTasks() as $cleanup) {
        $cleanup();
    }
});

test('store creates the appointment scheduled, manual, with created_by and derived end_at', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'duration_minutes' => 45,
    ]);
    $patient = Patient::factory()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-08-03T10:00:00',
    ]);

    $response->assertCreated();
    $appointment = Appointment::findOrFail($response->json('data.id'));

    expect($appointment->status)->toBe(AppointmentStatus::Scheduled);
    expect($appointment->origin)->toBe(AppointmentOrigin::Manual);
    expect($appointment->created_by)->toBe($membership->user_id);
    expect($appointment->start_at->format('Y-m-d H:i'))->toBe('2026-08-03 10:00');
    expect($appointment->end_at->format('Y-m-d H:i'))->toBe('2026-08-03 10:45');
});

test('store response includes the professional, patient and service names', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $patient = Patient::factory()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-08-03T10:00:00',
    ]);

    $response->assertCreated();
    $response->assertJsonPath('data.professional_name', $membership->user->name);
    $response->assertJsonPath('data.patient_name', $patient->name);
    $response->assertJsonPath('data.service_name', $professionalService->service->name);
});

test('store returns 409 when no professional_services row exists for the membership/service pair', function () {
    $membership = Membership::factory()->create();
    $service = Service::factory()->create();
    $patient = Patient::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $service->id,
        'start_at' => '2026-08-03T10:00:00',
    ])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::AppointmentsServiceNotActiveForProfessional->value);
});

test('store returns 409 when the professional_services row exists but is inactive', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'active' => false,
    ]);
    $patient = Patient::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-08-03T10:00:00',
    ])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::AppointmentsServiceNotActiveForProfessional->value);
});

test('store returns 409 when the new appointment overlaps an existing active appointment of the same membership (CU-20)', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'duration_minutes' => 30,
    ]);
    Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => '2026-08-03 10:00:00',
        'end_at' => '2026-08-03 10:30:00',
    ]);
    $patient = Patient::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-08-03T10:15:00',
    ])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::AppointmentsSlotTaken->value);
});

test('store succeeds when the new appointment starts exactly when an existing one ends', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'duration_minutes' => 30,
    ]);
    Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => '2026-08-03 10:00:00',
        'end_at' => '2026-08-03 10:30:00',
    ]);
    $patient = Patient::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-08-03T10:30:00',
    ])->assertCreated();
});

test('store succeeds when the only overlapping appointment has status cancelled', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'duration_minutes' => 30,
    ]);
    Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Cancelled,
        'start_at' => '2026-08-03 10:00:00',
        'end_at' => '2026-08-03 10:30:00',
    ]);
    $patient = Patient::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-08-03T10:15:00',
    ])->assertCreated();
});

test('store succeeds when the only overlapping appointment has status rescheduled', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'duration_minutes' => 30,
    ]);
    Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $professionalService->service_id,
        'status' => AppointmentStatus::Rescheduled,
        'start_at' => '2026-08-03 10:00:00',
        'end_at' => '2026-08-03 10:30:00',
    ]);
    $patient = Patient::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-08-03T10:15:00',
    ])->assertCreated();
});

test('store returns 409 when the same physical professional in a different organization already has an overlapping active appointment (CU-23)', function () {
    $user = User::factory()->create();

    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();

    // The most recently created active membership wins as the acting organization
    // (App\Http\Middleware\ResolveCurrentOrganization), so membership A is
    // backdated to guarantee membership B resolves for this request.
    $membershipA = Membership::factory()->create([
        'organization_id' => $organizationA->id,
        'user_id' => $user->id,
        'created_at' => now()->subMinute(),
    ]);
    $membershipB = Membership::factory()->create([
        'organization_id' => $organizationB->id,
        'user_id' => $user->id,
    ]);

    $professionalServiceA = ProfessionalService::factory()->create([
        'organization_id' => $organizationA->id,
        'membership_id' => $membershipA->id,
        'duration_minutes' => 30,
    ]);
    $professionalServiceB = ProfessionalService::factory()->create([
        'organization_id' => $organizationB->id,
        'membership_id' => $membershipB->id,
        'duration_minutes' => 30,
    ]);

    Appointment::factory()->create([
        'organization_id' => $organizationA->id,
        'membership_id' => $membershipA->id,
        'service_id' => $professionalServiceA->service_id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => '2026-08-03 10:00:00',
        'end_at' => '2026-08-03 10:30:00',
    ]);

    $patient = Patient::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/v1/appointments', [
        'membership_id' => $membershipB->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalServiceB->service_id,
        'start_at' => '2026-08-03T10:15:00',
    ]);

    $response->assertStatus(409)->assertJsonPath('error.code', ErrorCode::AppointmentsSlotTaken->value);
});

test('store succeeds when a different professional has an overlapping appointment at the same time', function () {
    $organization = Organization::factory()->create();
    $membershipA = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $membershipB = Membership::factory()->create(['organization_id' => $organization->id]);

    $professionalServiceA = ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membershipA->id,
        'duration_minutes' => 30,
    ]);
    $professionalServiceB = ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membershipB->id,
        'duration_minutes' => 30,
    ]);

    Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membershipA->id,
        'service_id' => $professionalServiceA->service_id,
        'status' => AppointmentStatus::Scheduled,
        'start_at' => '2026-08-03 10:00:00',
        'end_at' => '2026-08-03 10:30:00',
    ]);

    $patient = Patient::factory()->create();

    $this->actingAs($membershipA->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membershipB->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalServiceB->service_id,
        'start_at' => '2026-08-03T10:15:00',
    ])->assertCreated();
});

test('authorization on store: owner creates for any professional, a professional creates only for itself', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $anotherMember = Membership::factory()->create(['organization_id' => $organization->id]);

    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
    ]);
    $anotherMemberService = ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $anotherMember->id,
    ]);

    $patient1 = Patient::factory()->create();
    $patient2 = Patient::factory()->create();
    $patient3 = Patient::factory()->create();

    $this->actingAs($owner->user)->postJson('/api/v1/appointments', [
        'membership_id' => $anotherMember->id,
        'patient_id' => $patient1->id,
        'service_id' => $anotherMemberService->service_id,
        'start_at' => '2026-08-03T09:00:00',
    ])->assertCreated();

    $this->actingAs($professional->user)->postJson('/api/v1/appointments', [
        'membership_id' => $professional->id,
        'patient_id' => $patient2->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-08-03T09:00:00',
    ])->assertCreated();

    $this->actingAs($professional->user)->postJson('/api/v1/appointments', [
        'membership_id' => $anotherMember->id,
        'patient_id' => $patient3->id,
        'service_id' => $anotherMemberService->service_id,
        'start_at' => '2026-08-03T11:00:00',
    ])->assertStatus(403);
});

test('a guest gets 401 on store', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $patient = Patient::factory()->create();

    $this->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-08-03T13:00:00',
    ])->assertStatus(401);
});

// Declared last on purpose: the racing row it plants via a separate database
// session survives this test's own rollback (see raceCleanupTasks()/afterAll()
// above), so every earlier test must finish rolling back before it exists.
test('two concurrent requests booking the identical slot: only one appointment is created and the loser gets 409, not a 500', function () {
    // A genuinely separate database session (its own PDO connection, own Postgres
    // backend). Rows it creates commit immediately, so they're visible to this
    // test's connection under READ COMMITTED despite RefreshDatabase never committing.
    $config = config('database.connections.pgsql');
    $race = new PDO(
        sprintf('pgsql:host=%s;port=%s;dbname=%s', $config['host'], $config['port'], $config['database']),
        $config['username'],
        $config['password']
    );

    $organizationId = (int) $race->query(
        'INSERT INTO organizations (name, slug, timezone, created_at, updated_at) VALUES '.
        "('Race Org', 'race-org-".uniqid()."', 'America/Argentina/Buenos_Aires', now(), now()) RETURNING id"
    )->fetchColumn();

    $userId = (int) $race->query(
        'INSERT INTO users (name, email, password, created_at, updated_at) VALUES '.
        "('Race User', 'race-".uniqid()."@example.com', 'x', now(), now()) RETURNING id"
    )->fetchColumn();

    $membershipId = (int) $race->query(
        'INSERT INTO memberships (organization_id, user_id, roles, extra_permissions, status, created_at, updated_at) VALUES '.
        "({$organizationId}, {$userId}, '[\"owner\"]', '[]', 'active', now(), now()) RETURNING id"
    )->fetchColumn();

    $serviceId = (int) $race->query(
        'INSERT INTO services (name, created_at, updated_at) VALUES '.
        "('Race Service ".uniqid()."', now(), now()) RETURNING id"
    )->fetchColumn();

    $racerPatientId = (int) $race->query(
        'INSERT INTO patients (name, document_type, document_number, created_at, updated_at) VALUES '.
        "('Racer Patient', 'dni', '".random_int(10000000, 99999999)."', now(), now()) RETURNING id"
    )->fetchColumn();

    // Visible to this test's own connection (committed by $race above), so ordinary
    // Eloquent factories/queries on the main connection can reference these ids.
    ProfessionalService::factory()->create([
        'organization_id' => $organizationId,
        'membership_id' => $membershipId,
        'service_id' => $serviceId,
        'duration_minutes' => 30,
        'active' => true,
    ]);
    $loserPatient = Patient::factory()->create();

    $winnerAppointmentId = null;

    // Fires right after BookAppointmentAction takes the advisory lock and reads the
    // professional_services row, but before its own overlap check — the racing
    // session inserts and commits a competing appointment right here, exactly
    // like a real concurrent request that already won the race would.
    ProfessionalService::retrieved(function (ProfessionalService $retrieved) use (
        &$winnerAppointmentId,
        $race,
        $organizationId,
        $membershipId,
        $serviceId,
        $racerPatientId
    ): void {
        if ($winnerAppointmentId !== null || $retrieved->membership_id !== $membershipId) {
            return;
        }

        $winnerAppointmentId = (int) $race->query(
            'INSERT INTO appointments (organization_id, membership_id, patient_id, service_id, origin, status, start_at, end_at, created_at, updated_at) VALUES '.
            "({$organizationId}, {$membershipId}, {$racerPatientId}, {$serviceId}, 'manual', 'scheduled', '2026-08-03 10:00:00', '2026-08-03 10:30:00', now(), now()) RETURNING id"
        )->fetchColumn();
    });

    try {
        $user = User::findOrFail($userId);

        $response = $this->actingAs($user)->postJson('/api/v1/appointments', [
            'membership_id' => $membershipId,
            'patient_id' => $loserPatient->id,
            'service_id' => $serviceId,
            'start_at' => '2026-08-03T10:15:00',
        ]);

        $response->assertStatus(409)->assertJsonPath('error.code', ErrorCode::AppointmentsSlotTaken->value);
        expect(Appointment::query()->count())->toBe(1);
        expect(Appointment::query()->first()?->id)->toBe($winnerAppointmentId);
    } finally {
        ProfessionalService::flushEventListeners();
    }

    appointmentRaceCleanupTasks()[] = function () use ($race, $winnerAppointmentId, $membershipId, $userId, $organizationId, $serviceId, $racerPatientId): void {
        $race->exec("DELETE FROM appointments WHERE id = {$winnerAppointmentId}");
        $race->exec("DELETE FROM memberships WHERE id = {$membershipId}");
        $race->exec("DELETE FROM users WHERE id = {$userId}");
        $race->exec("DELETE FROM organizations WHERE id = {$organizationId}");
        $race->exec("DELETE FROM services WHERE id = {$serviceId}");
        $race->exec("DELETE FROM patients WHERE id = {$racerPatientId}");
    };
});
