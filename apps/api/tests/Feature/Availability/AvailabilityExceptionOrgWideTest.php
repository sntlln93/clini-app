<?php

declare(strict_types=1);

use App\Enums\AvailabilityExceptionType;
use App\Models\AvailabilityException;
use App\Models\Organization;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('organizationWide() persists an exception with a null membership_id and an intact organization', function () {
    $exception = AvailabilityException::factory()->organizationWide()->create();

    $row = DB::table('availability_exceptions')->where('id', $exception->id)->first();

    expect($row->membership_id)->toBeNull();
    expect($row->organization_id)->not->toBeNull();
    expect($row->organization_id)->toBe($exception->organization_id);
});

test('organizationWide() reuses a preexisting organization and creates no extra one', function () {
    $organization = Organization::factory()->create();
    $organizationCountBefore = Organization::count();

    $exception = AvailabilityException::factory()->organizationWide()->create(['organization_id' => $organization->id]);

    $row = DB::table('availability_exceptions')->where('id', $exception->id)->first();

    expect($row->organization_id)->toBe($organization->id);
    expect(Organization::count())->toBe($organizationCountBefore);
});

test('the global scope filters org-wide rows by the current organization', function () {
    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();

    AvailabilityException::factory()->organizationWide()->create(['organization_id' => $organizationA->id]);
    AvailabilityException::factory()->organizationWide()->create(['organization_id' => $organizationB->id]);

    app(CurrentOrganization::class)->set($organizationA->id);

    $exceptions = AvailabilityException::all();

    expect($exceptions)->toHaveCount(1);
    expect($exceptions->first()->organization_id)->toBe($organizationA->id);
    expect($exceptions->first()->membership_id)->toBeNull();
});

test('creating an org-wide exception without an explicit organization_id auto-fills it from the current organization', function () {
    $organizationA = Organization::factory()->create();

    app(CurrentOrganization::class)->set($organizationA->id);

    $exception = AvailabilityException::create([
        'membership_id' => null,
        'type' => AvailabilityExceptionType::Blocked,
        'start_at' => now(),
        'end_at' => now()->addHours(2),
    ]);

    expect($exception->fresh()->organization_id)->toBe($organizationA->id);
    expect($exception->fresh()->membership_id)->toBeNull();
});
