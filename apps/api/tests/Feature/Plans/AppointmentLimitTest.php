<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\ErrorCode;
use App\Enums\MembershipRole;
use App\Models\Appointment;
use App\Models\AppointmentLimitWarning;
use App\Models\Availability;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\ProfessionalService;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\Plans\AppointmentLimitApproachingNotification;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;

beforeEach(function () {
    configureMercadoPago();
    Notification::fake();
});

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
    Date::setTestNow();
});

// See the race test at the end of this file. Named apart from the other
// files' cleanup registries, since Pest shares top-level functions.
function &appointmentLimitRaceCleanupTasks(): array
{
    static $tasks = [];

    return $tasks;
}

afterAll(function () {
    foreach (appointmentLimitRaceCleanupTasks() as $cleanup) {
        $cleanup();
    }
});

/**
 * An owner who is also the professional, in an organization on the given
 * plan, with an active 30-minute service. Times below are UTC; the
 * organization's timezone is Buenos Aires (UTC-3) unless a test says so.
 *
 * @return array{0: Membership, 1: ProfessionalService}
 */
function limitFixture(?Organization $organization = null): array
{
    $organization ??= Organization::factory()->create(['timezone' => 'America/Argentina/Buenos_Aires']);
    $owner = Membership::factory()->withRoles(MembershipRole::Owner, MembershipRole::Professional)->create(['organization_id' => $organization->id]);
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $owner->id,
        'duration_minutes' => 30,
        'active' => true,
    ]);

    return [$owner, $professionalService];
}

/**
 * Plants appointments without going through the action, all at the same
 * time: the overlap check isn't what these tests are about.
 *
 * @param  array<string, mixed>  $attributes
 */
function plantAppointments(Membership $membership, int $count, string $startAt, array $attributes = []): void
{
    $patient = Patient::factory()->create();

    Appointment::factory()->count($count)->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'start_at' => $startAt,
        'end_at' => Date::parse($startAt)->addMinutes(30),
        ...$attributes,
    ]);
}

function bookManually(Membership $owner, ProfessionalService $professionalService, string $startAt): TestResponse
{
    return test()->actingAs($owner->user)->postJson('/api/v1/appointments', [
        'membership_id' => $owner->id,
        'patient_id' => Patient::factory()->create()->id,
        'service_id' => $professionalService->service_id,
        'start_at' => $startAt,
    ]);
}

test('Free accepts the 40th appointment of the month and rejects the 41st with 409', function () {
    [$owner, $professionalService] = limitFixture();
    plantAppointments($owner, 39, '2026-11-02 13:00:00');

    bookManually($owner, $professionalService, '2026-11-20T13:00:00Z')->assertCreated();

    bookManually($owner, $professionalService, '2026-11-21T13:00:00Z')
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::PlansAppointmentLimitReached->value)
        ->assertJsonPath('error.context', ['appointment_limit' => 40, 'month' => '2026-11']);

    expect(Appointment::query()->count())->toBe(40);
});

test('the month is the appointment\'s own, in the organization\'s timezone', function () {
    [$owner, $professionalService] = limitFixture();
    // 2026-12-01 01:00 UTC is still November 30 in Buenos Aires.
    plantAppointments($owner, 40, '2026-12-01 01:00:00');

    bookManually($owner, $professionalService, '2026-11-15T13:00:00Z')
        ->assertStatus(409)
        ->assertJsonPath('error.context.month', '2026-11');

    // 2026-12-01 03:00 UTC is December 1 at midnight in Buenos Aires: a new month.
    bookManually($owner, $professionalService, '2026-12-01T03:00:00Z')->assertCreated();
});

test('cancelled and rescheduled appointments free their place in the month', function () {
    [$owner, $professionalService] = limitFixture();
    plantAppointments($owner, 38, '2026-11-02 13:00:00');
    plantAppointments($owner, 1, '2026-11-03 13:00:00', ['status' => AppointmentStatus::Cancelled]);
    plantAppointments($owner, 1, '2026-11-03 14:00:00', ['status' => AppointmentStatus::Rescheduled]);

    bookManually($owner, $professionalService, '2026-11-20T13:00:00Z')->assertCreated();
    bookManually($owner, $professionalService, '2026-11-20T14:00:00Z')->assertCreated();
    bookManually($owner, $professionalService, '2026-11-20T15:00:00Z')->assertStatus(409);
});

test('paid plans have no monthly limit', function (Closure $organization) {
    [$owner, $professionalService] = limitFixture($organization());
    plantAppointments($owner, 40, '2026-11-02 13:00:00');

    bookManually($owner, $professionalService, '2026-11-20T13:00:00Z')->assertCreated();

    Notification::assertNothingSent();
})->with([
    'practice' => [fn () => tap(Organization::factory()->create(), fn (Organization $organization) => Subscription::factory()->create([
        'organization_id' => $organization->id,
        'provider_subscription_id' => null,
    ]))],
    'center' => [fn () => Organization::factory()->center()->create()],
]);

test('online booking is rejected at the limit without registering the patient, and the context never names the plan', function () {
    Date::setTestNow('2026-11-01 12:00:00');
    $organization = Organization::factory()->create(['timezone' => 'UTC']);
    [$owner, $professionalService] = limitFixture($organization);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $owner->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
    ]);
    plantAppointments($owner, 40, '2026-11-03 13:00:00');
    $patients = Patient::query()->count();

    $response = $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $owner->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-11-09T10:00:00Z',
        'patient' => [
            'name' => 'Juan Pérez',
            'document_type' => 'dni',
            'document_number' => '30111222',
            'email' => 'juan@example.com',
            'phone' => '1122334455',
        ],
    ]);

    $response->assertStatus(409)->assertJsonPath('error.code', ErrorCode::PlansAppointmentLimitReached->value);
    expect($response->json('error.context'))->not->toHaveKey('plan');
    expect(Patient::query()->count())->toBe($patients);
    expect(Appointment::withoutGlobalScope('organization')->count())->toBe(40);
});

test('rescheduling within a full month is allowed, into another full month it is rejected and rolled back', function () {
    [$owner, $professionalService] = limitFixture();
    plantAppointments($owner, 39, '2026-11-02 13:00:00');
    plantAppointments($owner, 40, '2026-12-02 13:00:00');
    $original = Appointment::factory()->create([
        'organization_id' => $owner->organization_id,
        'membership_id' => $owner->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-11-10 13:00:00',
        'end_at' => '2026-11-10 13:30:00',
    ]);

    $this->actingAs($owner->user)
        ->postJson("/api/v1/appointments/{$original->id}/reschedule", ['start_at' => '2026-12-10T13:00:00Z'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::PlansAppointmentLimitReached->value);
    expect($original->fresh()?->status)->toBe(AppointmentStatus::Scheduled);

    $this->actingAs($owner->user)
        ->postJson("/api/v1/appointments/{$original->id}/reschedule", ['start_at' => '2026-11-11T13:00:00Z'])
        ->assertCreated();
});

test('a month already over the limit, after a downgrade, still lets its appointments move within it', function () {
    [$owner, $professionalService] = limitFixture();
    plantAppointments($owner, 45, '2026-11-02 13:00:00');
    $original = Appointment::factory()->create([
        'organization_id' => $owner->organization_id,
        'membership_id' => $owner->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-11-10 13:00:00',
        'end_at' => '2026-11-10 13:30:00',
    ]);

    $this->actingAs($owner->user)
        ->postJson("/api/v1/appointments/{$original->id}/reschedule", ['start_at' => '2026-11-11T13:00:00Z'])
        ->assertCreated();

    bookManually($owner, $professionalService, '2026-11-12T13:00:00Z')->assertStatus(409);
});

test('online booking of a service the professional no longer offers reports that, not the full month', function () {
    Date::setTestNow('2026-11-01 12:00:00');
    $organization = Organization::factory()->create(['timezone' => 'UTC']);
    [$owner, $professionalService] = limitFixture($organization);
    $professionalService->update(['active' => false]);
    plantAppointments($owner, 40, '2026-11-03 13:00:00');

    $this->postJson("/api/v1/booking/{$organization->slug}/appointments", [
        'membership_id' => $owner->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-11-09T10:00:00Z',
        'patient' => [
            'name' => 'Juan Pérez',
            'document_type' => 'dni',
            'document_number' => '30111223',
            'email' => 'juan@example.com',
            'phone' => '1122334455',
        ],
    ])->assertStatus(409)->assertJsonPath('error.code', ErrorCode::AppointmentsServiceNotActiveForProfessional->value);
});

test('the 35th appointment of the month warns the owners by mail, once per month', function () {
    [$owner, $professionalService] = limitFixture();
    $coOwner = Membership::factory()->owner()->create(['organization_id' => $owner->organization_id]);
    $staff = Membership::factory()->staff()->create(['organization_id' => $owner->organization_id]);
    plantAppointments($owner, 33, '2026-11-02 13:00:00');

    bookManually($owner, $professionalService, '2026-11-20T13:00:00Z')->assertCreated();
    Notification::assertNothingSent();

    $response = bookManually($owner, $professionalService, '2026-11-20T14:00:00Z')->assertCreated();

    Notification::assertSentTo(
        [$owner->user, $coOwner->user],
        AppointmentLimitApproachingNotification::class,
        fn (AppointmentLimitApproachingNotification $notification): bool => $notification->month->format('Y-m') === '2026-11'
            && $notification->appointments === 35
            && $notification->appointmentLimit === 40,
    );
    Notification::assertNotSentTo($staff->user, AppointmentLimitApproachingNotification::class);
    Notification::assertSentTimes(AppointmentLimitApproachingNotification::class, 2);

    // Dropping below the threshold and climbing back doesn't warn again.
    Appointment::query()->findOrFail($response->json('data.id'))->update(['status' => AppointmentStatus::Cancelled]);
    bookManually($owner, $professionalService, '2026-11-20T15:00:00Z')->assertCreated();
    bookManually($owner, $professionalService, '2026-11-20T16:00:00Z')->assertCreated();

    Notification::assertSentTimes(AppointmentLimitApproachingNotification::class, 2);
    expect(AppointmentLimitWarning::query()->count())->toBe(1);
});

test('each month gets its own warning', function () {
    [$owner, $professionalService] = limitFixture();
    plantAppointments($owner, 34, '2026-11-02 13:00:00');
    plantAppointments($owner, 34, '2026-12-02 13:00:00');

    bookManually($owner, $professionalService, '2026-11-20T13:00:00Z')->assertCreated();
    bookManually($owner, $professionalService, '2026-12-20T13:00:00Z')->assertCreated();

    Notification::assertSentTimes(AppointmentLimitApproachingNotification::class, 2);
    expect(AppointmentLimitWarning::query()->pluck('month')->map->format('Y-m-d')->sort()->values()->all())
        ->toBe(['2026-11-01', '2026-12-01']);
});

test('the warning mail names the month and offers moving to Practice', function () {
    $organization = Organization::factory()->create(['name' => 'Consultorio Norte']);
    $mail = (new AppointmentLimitApproachingNotification($organization, Date::parse('2026-11-01')->toImmutable(), 35, 40))
        ->toMail($organization);

    expect($mail->subject)->toBe('Ya cargaste 35 de los 40 turnos de noviembre de 2026');
    expect($mail->introLines[0])->toBe('Consultorio Norte ya tiene 35 turnos en noviembre de 2026. El plan Gratis incluye hasta 40 turnos por mes.');
    expect($mail->actionText)->toBe('Pasar a Consultorio');
    expect($mail->actionUrl)->toEndWith('/ajustes');
});

test('GET /plan reports the current month\'s appointments in the organization\'s timezone', function () {
    Date::setTestNow('2026-11-15 12:00:00');
    [$owner] = limitFixture();
    plantAppointments($owner, 3, '2026-11-10 13:00:00');
    plantAppointments($owner, 1, '2026-11-10 14:00:00', ['status' => AppointmentStatus::Cancelled]);
    // October 31 in Buenos Aires, and December 1 in Buenos Aires.
    plantAppointments($owner, 1, '2026-11-01 02:00:00');
    plantAppointments($owner, 1, '2026-12-01 03:00:00');

    $this->actingAs($owner->user)->getJson('/api/v1/plan')
        ->assertOk()
        ->assertJsonPath('data.appointment_limit', 40)
        ->assertJsonPath('data.appointment_warning_threshold', 35)
        ->assertJsonPath('data.appointments_this_month', 3);
});

// Declared last on purpose, like AppointmentStoreTest's race test: the rows
// its separate session commits survive this test's rollback.
test('the 40th appointment is serialised per organization: a concurrent booking waits on its lock and then sees the month full', function () {
    $config = config('database.connections.pgsql');
    $race = new PDO(
        sprintf('pgsql:host=%s;port=%s;dbname=%s', $config['host'], $config['port'], $config['database']),
        $config['username'],
        $config['password']
    );

    $organizationId = (int) $race->query(
        'INSERT INTO organizations (name, slug, timezone, created_at, updated_at) VALUES '.
        "('Limit Race Org', 'limit-race-org-".uniqid()."', 'UTC', now(), now()) RETURNING id"
    )->fetchColumn();
    $userId = (int) $race->query(
        'INSERT INTO users (name, email, password, created_at, updated_at) VALUES '.
        "('Limit Race User', 'limit-race-".uniqid()."@example.com', 'x', now(), now()) RETURNING id"
    )->fetchColumn();
    $membershipId = (int) $race->query(
        'INSERT INTO memberships (organization_id, user_id, roles, extra_permissions, status, created_at, updated_at) VALUES '.
        "({$organizationId}, {$userId}, '[\"owner\",\"professional\"]', '[]', 'active', now(), now()) RETURNING id"
    )->fetchColumn();
    $serviceId = (int) $race->query(
        'INSERT INTO services (name, created_at, updated_at) VALUES '.
        "('Limit Race Service ".uniqid()."', now(), now()) RETURNING id"
    )->fetchColumn();
    $racerPatientId = (int) $race->query(
        'INSERT INTO patients (name, document_type, document_number, created_at, updated_at) VALUES '.
        "('Limit Racer', 'dni', '".random_int(10000000, 99999999)."', now(), now()) RETURNING id"
    )->fetchColumn();
    $race->exec(
        'INSERT INTO appointments (organization_id, membership_id, patient_id, service_id, origin, status, start_at, end_at, created_at, updated_at) '.
        "SELECT {$organizationId}, {$membershipId}, {$racerPatientId}, {$serviceId}, 'manual', 'scheduled', '2026-11-02 10:00:00', '2026-11-02 10:30:00', now(), now() FROM generate_series(1, 39)"
    );

    ProfessionalService::factory()->create([
        'organization_id' => $organizationId,
        'membership_id' => $membershipId,
        'service_id' => $serviceId,
        'duration_minutes' => 30,
        'active' => true,
    ]);
    $loserPatient = Patient::factory()->create();

    $competitorGotLock = null;

    // Fires after BookAppointmentAction took its locks and before it counts.
    // The racing session plays a concurrent booking that already won: it
    // can't take the organization's lock while this one holds it, and it
    // commits the month's 40th appointment.
    ProfessionalService::retrieved(function (ProfessionalService $retrieved) use (
        &$competitorGotLock,
        $race,
        $organizationId,
        $membershipId,
        $serviceId,
        $racerPatientId
    ): void {
        if ($competitorGotLock !== null || $retrieved->membership_id !== $membershipId) {
            return;
        }

        $competitorGotLock = (bool) $race->query("SELECT pg_try_advisory_lock(25, {$organizationId})")->fetchColumn();
        if ($competitorGotLock) {
            $race->query("SELECT pg_advisory_unlock(25, {$organizationId})");
        }

        $race->exec(
            'INSERT INTO appointments (organization_id, membership_id, patient_id, service_id, origin, status, start_at, end_at, created_at, updated_at) VALUES '.
            "({$organizationId}, {$membershipId}, {$racerPatientId}, {$serviceId}, 'online', 'scheduled', '2026-11-20 10:00:00', '2026-11-20 10:30:00', now(), now())"
        );
    });

    try {
        $response = $this->actingAs(User::findOrFail($userId))->postJson('/api/v1/appointments', [
            'membership_id' => $membershipId,
            'patient_id' => $loserPatient->id,
            'service_id' => $serviceId,
            'start_at' => '2026-11-21T10:00:00Z',
        ]);

        expect($competitorGotLock)->toBeFalse();
        $response->assertStatus(409)->assertJsonPath('error.code', ErrorCode::PlansAppointmentLimitReached->value);
        expect(Appointment::withoutGlobalScope('organization')->where('organization_id', $organizationId)->count())->toBe(40);
    } finally {
        ProfessionalService::flushEventListeners();
    }

    appointmentLimitRaceCleanupTasks()[] = function () use ($race, $membershipId, $userId, $organizationId, $serviceId, $racerPatientId): void {
        $race->exec("DELETE FROM appointments WHERE organization_id = {$organizationId}");
        $race->exec("DELETE FROM memberships WHERE id = {$membershipId}");
        $race->exec("DELETE FROM users WHERE id = {$userId}");
        $race->exec("DELETE FROM organizations WHERE id = {$organizationId}");
        $race->exec("DELETE FROM services WHERE id = {$serviceId}");
        $race->exec("DELETE FROM patients WHERE id = {$racerPatientId}");
    };
});
