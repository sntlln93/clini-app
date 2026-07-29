<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\AvailabilityExceptionType;
use App\Enums\DocumentType;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Models\Appointment;
use App\Models\Availability;
use App\Models\AvailabilityException;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\ProfessionalService;
use App\Models\ProfessionalSpecialty;
use App\Models\Reminder;
use App\Models\User;
use App\Models\UserSpecialty;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

test('re-seeding leaves every fixture table with identical row counts', function () {
    $this->seed(DatabaseSeeder::class);

    $countRows = fn (): array => [
        'organizations' => Organization::count(),
        'users' => User::count(),
        'memberships' => Membership::count(),
        'patients' => Patient::count(),
        'organization_patient' => DB::table('organization_patient')->count(),
        'availabilities' => Availability::count(),
        'availability_exceptions' => AvailabilityException::count(),
        // Appointment soft-deletes: an earlier bug in this branch made
        // re-seeding accumulate soft-deleted rows instead of clearing them.
        'appointments' => Appointment::withTrashed()->count(),
        'reminders' => Reminder::count(),
    ];

    $countsBefore = $countRows();

    $this->seed(DatabaseSeeder::class);

    expect($countRows())->toBe($countsBefore);
});

test('the two fixture organizations exist by slug', function () {
    $this->seed(DatabaseSeeder::class);

    $clinicaModelo = Organization::where('slug', 'clinica-modelo')->firstOrFail();
    $consultorioDos = Organization::where('slug', 'consultorio-dos')->firstOrFail();

    expect($clinicaModelo->name)->toBe('Clínica Modelo');
    expect($consultorioDos->name)->toBe('Consultorio Dos');
});

test('every documented user has the expected membership per organization', function () {
    $this->seed(DatabaseSeeder::class);

    $clinicaModelo = Organization::where('slug', 'clinica-modelo')->firstOrFail();
    $consultorioDos = Organization::where('slug', 'consultorio-dos')->firstOrFail();

    $expectations = [
        ['email' => 'ana.duena@test.com', 'organization' => $clinicaModelo, 'roles' => [MembershipRole::Owner], 'status' => MembershipStatus::Active],
        ['email' => 'bruno.admin@test.com', 'organization' => $clinicaModelo, 'roles' => [MembershipRole::Admin], 'status' => MembershipStatus::Active],
        ['email' => 'carla.profesional@test.com', 'organization' => $clinicaModelo, 'roles' => [MembershipRole::Professional], 'status' => MembershipStatus::Active],
        ['email' => 'carla.profesional@test.com', 'organization' => $consultorioDos, 'roles' => [MembershipRole::Professional], 'status' => MembershipStatus::Active],
        ['email' => 'diego.profesional@test.com', 'organization' => $clinicaModelo, 'roles' => [MembershipRole::Professional], 'status' => MembershipStatus::Inactive],
        ['email' => 'elena.staff@test.com', 'organization' => $clinicaModelo, 'roles' => [MembershipRole::Staff], 'status' => MembershipStatus::Active],
        ['email' => 'fabian.duenostaff@test.com', 'organization' => $clinicaModelo, 'roles' => [MembershipRole::Owner, MembershipRole::Staff], 'status' => MembershipStatus::Active],
        ['email' => 'gabriela.duena@test.com', 'organization' => $consultorioDos, 'roles' => [MembershipRole::Owner], 'status' => MembershipStatus::Active],
        ['email' => 'hernan.admin@test.com', 'organization' => $consultorioDos, 'roles' => [MembershipRole::Admin], 'status' => MembershipStatus::Suspended],
        ['email' => 'julian.staff@test.com', 'organization' => $consultorioDos, 'roles' => [MembershipRole::Staff], 'status' => MembershipStatus::Active],
    ];

    foreach ($expectations as $expectation) {
        $user = User::where('email', $expectation['email'])->firstOrFail();

        $membership = Membership::where('user_id', $user->id)
            ->where('organization_id', $expectation['organization']->id)
            ->firstOrFail();

        expect($membership->roles)->toBe($expectation['roles']);
        expect($membership->status)->toBe($expectation['status']);
    }
});

test('every MembershipRole and MembershipStatus case appears in at least one seeded membership', function () {
    $this->seed(DatabaseSeeder::class);

    $memberships = Membership::all();
    $seededRoles = $memberships->flatMap(fn (Membership $membership): array => $membership->roles);
    $seededStatuses = $memberships->pluck('status');

    foreach (MembershipRole::cases() as $role) {
        expect($seededRoles->contains($role))->toBeTrue("missing a seeded membership with role {$role->value}");
    }

    foreach (MembershipStatus::cases() as $status) {
        expect($seededStatuses->contains($status))->toBeTrue("missing a seeded membership with status {$status->value}");
    }
});

test('carla.profesional is the cross-organization user with a membership in both organizations', function () {
    $this->seed(DatabaseSeeder::class);

    $carla = User::where('email', 'carla.profesional@test.com')->firstOrFail();

    $organizationIds = $carla->memberships->pluck('organization_id')->unique();

    expect($organizationIds)->toHaveCount(2);
});

test('every seeded user password verifies against the shared dev password', function () {
    $this->seed(DatabaseSeeder::class);

    foreach (User::all() as $user) {
        expect(Hash::check('password', $user->password))->toBeTrue();
    }
});

test('an authenticated active owner of clinica-modelo can list patients', function () {
    $this->seed(DatabaseSeeder::class);

    $owner = User::where('email', 'ana.duena@test.com')->firstOrFail();

    $response = $this->actingAs($owner)->getJson('/api/v1/patients');

    $response->assertOk();
});

test('the seeded patients include at least one with an insurance provider and at least one without', function () {
    $this->seed(DatabaseSeeder::class);

    $patients = Patient::all();

    expect($patients->contains(fn (Patient $patient): bool => $patient->insurance_provider_id !== null))->toBeTrue();
    expect($patients->contains(fn (Patient $patient): bool => $patient->insurance_provider_id === null))->toBeTrue();
});

test('the patient shared by both organizations is a single row linked through the organization_patient pivot', function () {
    $this->seed(DatabaseSeeder::class);

    $patients = Patient::where('document_type', DocumentType::Dni)
        ->where('document_number', '30111222')
        ->get();

    expect($patients)->toHaveCount(1);

    $organizationSlugs = $patients->first()->organizations->pluck('slug')->sort()->values()->all();

    expect($organizationSlugs)->toBe(['clinica-modelo', 'consultorio-dos']);
});

test('every professional membership has specialties and services, credential-backed by user_specialties', function () {
    $this->seed(DatabaseSeeder::class);

    $professionalMemberships = Membership::all()
        ->filter(fn (Membership $membership): bool => in_array(MembershipRole::Professional, $membership->roles, true));

    expect($professionalMemberships)->not->toBeEmpty();

    foreach ($professionalMemberships as $membership) {
        $specialtyAssignments = ProfessionalSpecialty::where('membership_id', $membership->id)->get();
        $serviceAssignments = ProfessionalService::where('membership_id', $membership->id)->get();

        expect($specialtyAssignments)->not->toBeEmpty();
        expect($serviceAssignments)->not->toBeEmpty();

        foreach ($specialtyAssignments as $assignment) {
            $hasCredential = UserSpecialty::where('user_id', $membership->user_id)
                ->where('specialty_id', $assignment->specialty_id)
                ->exists();

            expect($hasCredential)->toBeTrue();
        }
    }
});

test('both AvailabilityExceptionType cases appear among the seeded exceptions', function () {
    $this->seed(DatabaseSeeder::class);

    $seededTypes = AvailabilityException::pluck('type');

    foreach (AvailabilityExceptionType::cases() as $type) {
        expect($seededTypes->contains($type))->toBeTrue("missing a seeded availability exception of type {$type->value}");
    }
});

test('each fixture organization schedules its active professional, not its inactive one', function () {
    $this->seed(DatabaseSeeder::class);

    $clinicaModelo = Organization::where('slug', 'clinica-modelo')->firstOrFail();
    $consultorioDos = Organization::where('slug', 'consultorio-dos')->firstOrFail();

    $carla = User::where('email', 'carla.profesional@test.com')->firstOrFail();
    $diego = User::where('email', 'diego.profesional@test.com')->firstOrFail();

    $carlaAtClinicaModelo = Membership::where('user_id', $carla->id)
        ->where('organization_id', $clinicaModelo->id)
        ->firstOrFail();

    $carlaAtConsultorioDos = Membership::where('user_id', $carla->id)
        ->where('organization_id', $consultorioDos->id)
        ->firstOrFail();

    $diegoAtClinicaModelo = Membership::where('user_id', $diego->id)
        ->where('organization_id', $clinicaModelo->id)
        ->firstOrFail();

    expect(Availability::where('membership_id', $carlaAtClinicaModelo->id)->count())->toBeGreaterThan(0);
    expect(Availability::where('membership_id', $carlaAtConsultorioDos->id)->count())->toBeGreaterThan(0);
    expect(Availability::where('membership_id', $diegoAtClinicaModelo->id)->count())->toBe(0);
});

test('every AppointmentStatus case appears in at least one seeded appointment', function () {
    $this->seed(DatabaseSeeder::class);

    $seededStatuses = Appointment::withTrashed()->pluck('status');

    foreach (AppointmentStatus::cases() as $status) {
        expect($seededStatuses->contains($status))->toBeTrue("missing a seeded appointment with status {$status->value}");
    }
});

test('at least one appointment is cancelled and at least one has a resolvable rescheduled_from_id', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Appointment::withTrashed()->where('status', AppointmentStatus::Cancelled)->exists())->toBeTrue();

    $rescheduled = Appointment::withTrashed()->whereNotNull('rescheduled_from_id')->first();

    expect($rescheduled)->not->toBeNull();
    expect(Appointment::withTrashed()->whereKey($rescheduled->rescheduled_from_id)->exists())->toBeTrue();
});

test('seeded appointments span past, today and future relative to now', function () {
    $this->seed(DatabaseSeeder::class);

    $appointments = Appointment::withTrashed()->get();

    expect($appointments->contains(fn (Appointment $appointment): bool => $appointment->start_at->lt(now())))->toBeTrue();
    expect($appointments->contains(fn (Appointment $appointment): bool => $appointment->start_at->isToday()))->toBeTrue();
    expect($appointments->contains(fn (Appointment $appointment): bool => $appointment->start_at->gt(now())))->toBeTrue();
});

test('re-seeding never touches an organization outside the fixture', function () {
    $this->seed(DatabaseSeeder::class);

    $foreignOrganization = Organization::factory()->create();
    $foreignAvailability = Availability::factory()->create(['organization_id' => $foreignOrganization->id]);
    $foreignAppointment = Appointment::factory()->create(['organization_id' => $foreignOrganization->id]);

    $this->seed(DatabaseSeeder::class);

    expect(Availability::find($foreignAvailability->id))->not->toBeNull();
    expect(Appointment::find($foreignAppointment->id))->not->toBeNull();
});
