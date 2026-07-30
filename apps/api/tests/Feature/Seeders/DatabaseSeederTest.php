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

test('the seeded patients listing paginates with a partial second page', function () {
    $this->seed(DatabaseSeeder::class);

    $owner = User::where('email', 'ana.duena@test.com')->firstOrFail();

    $response = $this->actingAs($owner)->getJson('/api/v1/patients');

    $response->assertOk();
    expect($response->json('meta.total'))->toBe(23);
    expect($response->json('data'))->toHaveCount(15);
    expect($response->json('meta.last_page'))->toBe(2);
    expect($response->json('meta.current_page'))->toBe(1);
});

test('the seeded patients listing second page is partial', function () {
    $this->seed(DatabaseSeeder::class);

    $owner = User::where('email', 'ana.duena@test.com')->firstOrFail();

    $response = $this->actingAs($owner)->getJson('/api/v1/patients?page=2');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(8);
});

test('the seeded memberships listing paginates with a partial second page', function () {
    $this->seed(DatabaseSeeder::class);

    $owner = User::where('email', 'ana.duena@test.com')->firstOrFail();

    $firstPage = $this->actingAs($owner)->getJson('/api/v1/memberships');

    $firstPage->assertOk();
    expect($firstPage->json('meta.total'))->toBe(20);
    expect($firstPage->json('data'))->toHaveCount(15);
    expect($firstPage->json('meta.last_page'))->toBe(2);

    $secondPage = $this->actingAs($owner)->getJson('/api/v1/memberships?page=2');

    $secondPage->assertOk();
    expect($secondPage->json('data'))->toHaveCount(5);
});

test('the volume fixtures do not leak into consultorio-dos', function () {
    $this->seed(DatabaseSeeder::class);

    $consultorioDos = Organization::where('slug', 'consultorio-dos')->firstOrFail();

    expect(DB::table('organization_patient')->where('organization_id', $consultorioDos->id)->count())->toBe(3);
    expect(Membership::where('organization_id', $consultorioDos->id)->count())->toBe(4);
});

test('re-seeding keeps the volume counts for clinica-modelo exact and does not duplicate users', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    $clinicaModelo = Organization::where('slug', 'clinica-modelo')->firstOrFail();

    expect(DB::table('organization_patient')->where('organization_id', $clinicaModelo->id)->count())->toBe(23);
    expect(Membership::where('organization_id', $clinicaModelo->id)->count())->toBe(20);
    expect(User::pluck('email')->duplicates())->toBeEmpty();
});

test('the volume fixtures are literal and deterministic, and no document or email repeats in the seeded database', function () {
    $this->seed(DatabaseSeeder::class);

    $volumeDocumentNumbers = [
        '40000001', '40000002', '40000003', '40000004', '40000005',
        '40000006', '40000007', '40000008', '40000009', '40000010',
        '40000011', '40000012', '40000013', '40000014', '40000015',
        '40000016', '40000017', '40000018', '40000019', '40000020',
    ];

    $volumeStaffEmails = [
        'staff01@test.com', 'staff02@test.com', 'staff03@test.com', 'staff04@test.com', 'staff05@test.com',
        'staff06@test.com', 'staff07@test.com', 'staff08@test.com', 'staff09@test.com', 'staff10@test.com',
        'staff11@test.com', 'staff12@test.com', 'staff13@test.com', 'staff14@test.com',
    ];

    $seededVolumeDocuments = Patient::where('document_type', DocumentType::Dni)
        ->whereIn('document_number', $volumeDocumentNumbers)
        ->pluck('document_number')
        ->sort()
        ->values()
        ->all();

    $seededVolumeEmails = User::whereIn('email', $volumeStaffEmails)
        ->pluck('email')
        ->sort()
        ->values()
        ->all();

    expect($seededVolumeDocuments)->toBe($volumeDocumentNumbers);
    expect($seededVolumeEmails)->toBe($volumeStaffEmails);

    expect(Patient::pluck('document_number')->duplicates())->toBeEmpty();
    expect(User::pluck('email')->duplicates())->toBeEmpty();
});

test('the volume memberships have no seeded availabilities', function () {
    $this->seed(DatabaseSeeder::class);

    $volumeStaffEmails = [
        'staff01@test.com', 'staff02@test.com', 'staff03@test.com', 'staff04@test.com', 'staff05@test.com',
        'staff06@test.com', 'staff07@test.com', 'staff08@test.com', 'staff09@test.com', 'staff10@test.com',
        'staff11@test.com', 'staff12@test.com', 'staff13@test.com', 'staff14@test.com',
    ];

    $volumeMembershipIds = Membership::whereIn('user_id', User::whereIn('email', $volumeStaffEmails)->pluck('id'))
        ->pluck('id');

    expect($volumeMembershipIds)->toHaveCount(14);
    expect(Availability::whereIn('membership_id', $volumeMembershipIds)->count())->toBe(0);
});
