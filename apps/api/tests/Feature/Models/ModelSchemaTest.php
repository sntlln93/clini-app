<?php

declare(strict_types=1);

use App\Enums\AppointmentOrigin;
use App\Enums\AppointmentStatus;
use App\Enums\AvailabilityExceptionType;
use App\Enums\DocumentType;
use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Enums\Sex;
use App\Models\Address;
use App\Models\Appointment;
use App\Models\Availability;
use App\Models\AvailabilityException;
use App\Models\InsuranceProvider;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\ProfessionalService;
use App\Models\ProfessionalSpecialty;
use App\Models\Reminder;
use App\Models\Service;
use App\Models\Specialty;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

test('each of the 13 models can be created singly and in a batch via its factory', function (string $modelClass) {
    $single = $modelClass::factory()->create();
    expect($single)->toBeInstanceOf($modelClass);

    $batch = $modelClass::factory()->count(3)->create();
    expect($batch)->toHaveCount(3);
    expect($batch->first())->toBeInstanceOf($modelClass);
})->with([
    Organization::class,
    Membership::class,
    Specialty::class,
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
]);

test('Appointment casts status and origin to their enums', function () {
    $appointment = Appointment::factory()->create([
        'status' => AppointmentStatus::Confirmed,
        'origin' => AppointmentOrigin::Online,
    ]);

    expect($appointment->status)->toBeInstanceOf(AppointmentStatus::class);
    expect($appointment->origin)->toBeInstanceOf(AppointmentOrigin::class);
});

test('Membership casts role and status to their enums', function () {
    $membership = Membership::factory()->create([
        'role' => MembershipRole::Owner,
        'status' => MembershipStatus::Active,
    ]);

    expect($membership->role)->toBeInstanceOf(MembershipRole::class);
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

test('deleting a Specialty cascades to its professional_specialties rows', function () {
    $specialty = Specialty::factory()->create();
    $professionalSpecialty = ProfessionalSpecialty::factory()->create([
        'specialty_id' => $specialty->id,
    ]);

    $specialty->forceDelete();

    expect(DB::table('professional_specialties')->where('id', $professionalSpecialty->id)->exists())->toBeFalse();
});
