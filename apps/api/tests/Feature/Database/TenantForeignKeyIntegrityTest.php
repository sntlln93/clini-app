<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\AvailabilityException;
use App\Models\Membership;
use App\Models\ProfessionalService;
use App\Models\ProfessionalSpecialty;
use App\Models\Reminder;
use App\Models\Specialty;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

test('a direct insert into appointments with a membership from a different organization fails at the database level', function () {
    $base = Appointment::factory()->create();
    $otherMembership = Membership::factory()->create();

    $attributes = collect($base->getAttributes())->except('id')->all();
    $attributes['membership_id'] = $otherMembership->id;

    expect(fn () => DB::table('appointments')->insert($attributes))
        ->toThrow(QueryException::class);
});

// service_id is a simple FK since issue #21 (services is now a global,
// non-tenant catalog): a nonexistent id still fails, but "belongs to
// another organization" is no longer a concept the schema enforces here.
test('a direct insert into appointments with a non-existent service_id fails at the database level', function () {
    $base = Appointment::factory()->create();

    $attributes = collect($base->getAttributes())->except('id')->all();
    $attributes['service_id'] = 999999;

    expect(fn () => DB::table('appointments')->insert($attributes))
        ->toThrow(QueryException::class);
});

test('a direct insert into appointments with a rescheduled_from_id pointing at another organization fails at the database level', function () {
    $base = Appointment::factory()->create();
    $otherAppointment = Appointment::factory()->create();

    $attributes = collect($base->getAttributes())->except('id')->all();
    $attributes['rescheduled_from_id'] = $otherAppointment->id;

    expect(fn () => DB::table('appointments')->insert($attributes))
        ->toThrow(QueryException::class);
});

// service_id is a simple FK since issue #21: a nonexistent id still fails,
// but a service used by another organization is no longer rejected — see
// the "succeeds" test below, which documents that inversion deliberately.
test('a direct insert into professional_services with a non-existent service_id fails at the database level', function () {
    $base = ProfessionalService::factory()->create();

    $attributes = collect($base->getAttributes())->except('id')->all();
    $attributes['service_id'] = 999999;

    expect(fn () => DB::table('professional_services')->insert($attributes))
        ->toThrow(QueryException::class);
});

test('a direct insert into professional_services with a service already assigned in another organization succeeds, since the catalog is global', function () {
    $base = ProfessionalService::factory()->create();
    $otherMembership = Membership::factory()->create();

    $attributes = collect($base->getAttributes())->except('id')->all();
    $attributes['membership_id'] = $otherMembership->id;
    $attributes['organization_id'] = $otherMembership->organization_id;

    expect(fn () => DB::table('professional_services')->insert($attributes))
        ->not->toThrow(QueryException::class);
});

test('a direct insert into professional_specialties with a user_id not matching the membership user fails at the database level', function () {
    $base = ProfessionalSpecialty::factory()->create();
    $otherUser = User::factory()->create();

    $attributes = collect($base->getAttributes())->except('id')->all();
    $attributes['user_id'] = $otherUser->id;

    expect(fn () => DB::table('professional_specialties')->insert($attributes))
        ->toThrow(QueryException::class);
});

test('a direct insert into professional_specialties with a specialty outside the user credential fails at the database level', function () {
    $base = ProfessionalSpecialty::factory()->create();
    $otherSpecialty = Specialty::factory()->create();

    $attributes = collect($base->getAttributes())->except('id')->all();
    $attributes['specialty_id'] = $otherSpecialty->id;

    expect(fn () => DB::table('professional_specialties')->insert($attributes))
        ->toThrow(QueryException::class);
});

test('a direct insert into reminders with an appointment from a different organization fails at the database level', function () {
    $base = Reminder::factory()->create();
    $otherAppointment = Appointment::factory()->create();

    $attributes = collect($base->getAttributes())->except('id')->all();
    $attributes['appointment_id'] = $otherAppointment->id;

    expect(fn () => DB::table('reminders')->insert($attributes))
        ->toThrow(QueryException::class);
});

test('a fully tenant-coherent appointments row inserts successfully via a direct insert', function () {
    $base = Appointment::factory()->create();

    $attributes = collect($base->getAttributes())->except('id')->all();

    expect(fn () => DB::table('appointments')->insert($attributes))
        ->not->toThrow(QueryException::class);
});

test('an availability_exceptions row with a null membership_id inserts successfully via a direct insert', function () {
    $base = AvailabilityException::factory()->create();

    $attributes = collect($base->getAttributes())->except('id')->all();
    $attributes['membership_id'] = null;

    expect(fn () => DB::table('availability_exceptions')->insert($attributes))
        ->not->toThrow(QueryException::class);
});
