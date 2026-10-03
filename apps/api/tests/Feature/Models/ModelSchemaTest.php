<?php

declare(strict_types=1);

use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Enums\AvailabilityExceptionType;
use App\Enums\DocumentType;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\Province as ProvinceSlug;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Enums\Sex;
use App\Models\Address;
use App\Models\Appointment;
use App\Models\Availability;
use App\Models\AvailabilityException;
use App\Models\City;
use App\Models\Holiday;
use App\Models\InsuranceProvider;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\OrganizationHoliday;
use App\Models\Patient;
use App\Models\ProfessionalService;
use App\Models\ProfessionalSpecialty;
use App\Models\Province;
use App\Models\Reminder;
use App\Models\Service;
use App\Models\Specialty;
use App\Models\User;
use App\Models\UserSpecialty;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

test('each of the 17 models can be created singly and in a batch via its factory', function (string $modelClass) {
    $single = $modelClass::factory()->create();
    expect($single)->toBeInstanceOf($modelClass);

    $batch = $modelClass::factory()->count(3)->create();
    expect($batch)->toHaveCount(3);
    expect($batch->first())->toBeInstanceOf($modelClass);
})->with([
    Organization::class,
    Membership::class,
    Specialty::class,
    UserSpecialty::class,
    ProfessionalSpecialty::class,
    Patient::class,
    Service::class,
    ProfessionalService::class,
    Availability::class,
    AvailabilityException::class,
    Appointment::class,
    InsuranceProvider::class,
    Address::class,
    Reminder::class,
    City::class,
    Holiday::class,
    OrganizationHoliday::class,
]);

test('Appointment casts status and origin to their enums', function () {
    $appointment = Appointment::factory()->create([
        'status' => AppointmentStatus::Confirmed,
        'origin' => AppointmentOrigin::Online,
    ]);

    expect($appointment->status)->toBeInstanceOf(AppointmentStatus::class);
    expect($appointment->origin)->toBeInstanceOf(AppointmentOrigin::class);
});

test('Membership casts roles and status to their enums', function () {
    $membership = Membership::factory()->create([
        'roles' => [MembershipRole::Owner],
        'status' => MembershipStatus::Active,
    ]);

    expect($membership->roles)->toBe([MembershipRole::Owner]);
    expect($membership->status)->toBeInstanceOf(MembershipStatus::class);
});

test('Patient casts document_type and sex to their enums', function () {
    $patient = Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'sex' => Sex::F,
    ]);

    expect($patient->document_type)->toBeInstanceOf(DocumentType::class);
    expect($patient->sex)->toBeInstanceOf(Sex::class);
});

test('AvailabilityException casts type to its enum', function () {
    $exception = AvailabilityException::factory()->create([
        'type' => AvailabilityExceptionType::Blocked,
    ]);

    expect($exception->type)->toBeInstanceOf(AvailabilityExceptionType::class);
});

test('Reminder casts channel and status to their enums', function () {
    $reminder = Reminder::factory()->create([
        'channel' => ReminderChannel::Sms,
        'status' => ReminderStatus::Pending,
    ]);

    expect($reminder->channel)->toBeInstanceOf(ReminderChannel::class);
    expect($reminder->status)->toBeInstanceOf(ReminderStatus::class);
});

test('deleting an Appointment soft-deletes it', function () {
    $appointment = Appointment::factory()->create();
    $id = $appointment->id;

    $appointment->delete();

    expect(Appointment::find($id))->toBeNull();
    expect(Appointment::withTrashed()->find($id))->not->toBeNull();
    expect(Appointment::withTrashed()->find($id)->deleted_at)->not->toBeNull();
});

test('deleting an Organization soft-deletes it', function () {
    $organization = Organization::factory()->create();
    $id = $organization->id;

    $organization->delete();

    expect(Organization::find($id))->toBeNull();
    expect(Organization::withTrashed()->find($id))->not->toBeNull();
    expect(Organization::withTrashed()->find($id)->deleted_at)->not->toBeNull();
});

test('deleting a Patient soft-deletes it', function () {
    $patient = Patient::factory()->create();
    $id = $patient->id;

    $patient->delete();

    expect(Patient::find($id))->toBeNull();
    expect(Patient::withTrashed()->find($id))->not->toBeNull();
    expect(Patient::withTrashed()->find($id)->deleted_at)->not->toBeNull();
});

test('deleting an Availability removes the row entirely, since it is not soft-deletable', function () {
    $availability = Availability::factory()->create();
    $id = $availability->id;

    $availability->delete();

    expect(DB::table('availabilities')->where('id', $id)->exists())->toBeFalse();
});

test('Appointment resolves its organization, membership, patient and service relations', function () {
    $appointment = Appointment::factory()->create();

    expect($appointment->organization)->toBeInstanceOf(Organization::class);
    expect($appointment->organization->id)->toBe($appointment->organization_id);

    expect($appointment->membership)->toBeInstanceOf(Membership::class);
    expect($appointment->membership->id)->toBe($appointment->membership_id);

    expect($appointment->patient)->toBeInstanceOf(Patient::class);
    expect($appointment->patient->id)->toBe($appointment->patient_id);

    expect($appointment->service)->toBeInstanceOf(Service::class);
    expect($appointment->service->id)->toBe($appointment->service_id);
});

test('Appointment resolves the appointment it was rescheduled from', function () {
    $original = Appointment::factory()->create();
    $rescheduled = Appointment::factory()->create([
        'organization_id' => $original->organization_id,
        'rescheduled_from_id' => $original->id,
    ]);

    expect($rescheduled->rescheduledFrom)->toBeInstanceOf(Appointment::class);
    expect($rescheduled->rescheduledFrom->id)->toBe($original->id);
});

test('Organization appointments relation contains the created appointment', function () {
    $organization = Organization::factory()->create();
    $appointment = Appointment::factory()->create(['organization_id' => $organization->id]);

    expect($organization->appointments->pluck('id'))->toContain($appointment->id);
});

test('Address addressable morphTo resolves to the Organization', function () {
    $organization = Organization::factory()->create();
    $address = Address::factory()->create([
        'addressable_type' => Organization::class,
        'addressable_id' => $organization->id,
    ]);

    expect($address->addressable)->toBeInstanceOf(Organization::class);
    expect($address->addressable->id)->toBe($organization->id);
});

test('the provinces table holds exactly one row per Province enum case, slug cast back to the enum', function () {
    $slugs = Province::query()->orderBy('slug')->get()->map(fn (Province $province) => $province->slug)->all();

    $expected = collect(ProvinceSlug::cases())->sortBy(fn (ProvinceSlug $case) => $case->value)->values()->all();
    expect($slugs)->toBe($expected);
    expect(Province::query()->where('slug', ProvinceSlug::Cordoba->value)->value('name'))->toBe('Córdoba');
});

test('Address resolves its city and the city its province', function () {
    $city = City::factory()->inProvince(ProvinceSlug::LaRioja)->create();
    $address = Address::factory()->create(['city_id' => $city->id]);

    expect($address->city?->is($city))->toBeTrue();
    expect($address->city?->province?->slug)->toBe(ProvinceSlug::LaRioja);
});

test('a city name is unique within its province but may repeat across provinces', function () {
    City::factory()->inProvince(ProvinceSlug::BuenosAires)->create(['name' => 'San Martín']);
    City::factory()->inProvince(ProvinceSlug::Mendoza)->create(['name' => 'San Martín']);

    expect(fn () => City::factory()->inProvince(ProvinceSlug::BuenosAires)->create(['name' => 'San Martín']))
        ->toThrow(QueryException::class);
});

test('Organization resolves its province through its oldest address city', function () {
    $organization = Organization::factory()->inProvince(ProvinceSlug::Cordoba)->create();
    $this->travel(1)->minutes();
    Address::factory()->create([
        'addressable_type' => Organization::class,
        'addressable_id' => $organization->id,
        'city_id' => City::factory()->inProvince(ProvinceSlug::Salta),
    ]);

    expect($organization->resolveProvince())->toBe(ProvinceSlug::Cordoba);
});

test('Organization without an address, or whose address has no city, resolves no province', function () {
    $withoutAddress = Organization::factory()->create();
    $withoutCity = Organization::factory()->create();
    Address::factory()->withoutCity()->create([
        'addressable_type' => Organization::class,
        'addressable_id' => $withoutCity->id,
    ]);

    expect($withoutAddress->resolveProvince())->toBeNull();
    expect($withoutCity->resolveProvince())->toBeNull();
});

test('an organization holiday date is unique per organization', function () {
    $holiday = OrganizationHoliday::factory()->create(['date' => '2026-08-03']);
    OrganizationHoliday::factory()->create(['date' => '2026-08-03']);

    expect(fn () => OrganizationHoliday::factory()->create(['organization_id' => $holiday->organization_id, 'date' => '2026-08-03']))
        ->toThrow(QueryException::class);
});

test('Patient resolves its insuranceProvider relation', function () {
    $insuranceProvider = InsuranceProvider::factory()->create();
    $patient = Patient::factory()->create(['insurance_provider_id' => $insuranceProvider->id]);

    expect($patient->insuranceProvider)->toBeInstanceOf(InsuranceProvider::class);
    expect($patient->insuranceProvider->id)->toBe($insuranceProvider->id);
});

test('Reminder resolves its appointment relation', function () {
    $appointment = Appointment::factory()->create();
    $reminder = Reminder::factory()->create([
        'organization_id' => $appointment->organization_id,
        'appointment_id' => $appointment->id,
    ]);

    expect($reminder->appointment)->toBeInstanceOf(Appointment::class);
    expect($reminder->appointment->id)->toBe($appointment->id);
});

test('creating a patient with a duplicate document identity throws a query exception', function () {
    Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '12345678',
    ]);

    expect(fn () => Patient::factory()->create([
        'document_type' => DocumentType::Dni,
        'document_number' => '12345678',
    ]))->toThrow(QueryException::class);
});

// Since #21, Specialty is global catalog data; restrictOnDelete blocks a direct delete until every
// user_specialties link is removed, which cascades to professional_specialties.
test('deleting a Specialty held as a user credential is blocked at the database level', function () {
    $userSpecialty = UserSpecialty::factory()->create();

    expect(fn () => $userSpecialty->specialty->forceDelete())->toThrow(QueryException::class);
});

test('deleting a user_specialties row cascades to its professional_specialties rows', function () {
    $professionalSpecialty = ProfessionalSpecialty::factory()->create();

    UserSpecialty::query()
        ->where('user_id', $professionalSpecialty->user_id)
        ->where('specialty_id', $professionalSpecialty->specialty_id)
        ->delete();

    expect(DB::table('professional_specialties')->where('id', $professionalSpecialty->id)->exists())->toBeFalse();
});

test('ProfessionalSpecialty resolves its user relation', function () {
    $professionalSpecialty = ProfessionalSpecialty::factory()->create();

    expect($professionalSpecialty->user)->toBeInstanceOf(User::class);
    expect($professionalSpecialty->user->id)->toBe($professionalSpecialty->user_id);
});

test('ProfessionalService carries duration_minutes, price_cents and currency', function () {
    $professionalService = ProfessionalService::factory()->create([
        'duration_minutes' => 45,
        'price_cents' => 500000,
    ]);

    expect($professionalService->duration_minutes)->toBe(45);
    expect($professionalService->price_cents)->toBe(500000);
    expect($professionalService->currency)->toBe('ARS');
});

test('UserSpecialty resolves its user and specialty relations', function () {
    $userSpecialty = UserSpecialty::factory()->create();

    expect($userSpecialty->user)->toBeInstanceOf(User::class);
    expect($userSpecialty->user->id)->toBe($userSpecialty->user_id);

    expect($userSpecialty->specialty)->toBeInstanceOf(Specialty::class);
    expect($userSpecialty->specialty->id)->toBe($userSpecialty->specialty_id);
});
