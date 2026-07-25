<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\AvailabilityException;
use App\Models\Membership;
use App\Models\ProfessionalService;
use App\Models\Reminder;
use App\Models\Service;
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

test('a direct insert into appointments with a service from a different organization fails at the database level', function () {
    $base = Appointment::factory()->create();
    $otherService = Service::factory()->create();

    $attributes = collect($base->getAttributes())->except('id')->all();
    $attributes['service_id'] = $otherService->id;

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

test('a direct insert into professional_services with a service from a different organization fails at the database level', function () {
    $base = ProfessionalService::factory()->create();
    $otherService = Service::factory()->create();

    $attributes = collect($base->getAttributes())->except('id')->all();
    $attributes['service_id'] = $otherService->id;

    expect(fn () => DB::table('professional_services')->insert($attributes))
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
