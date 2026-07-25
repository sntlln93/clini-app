<?php

declare(strict_types=1);

use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Service;
use App\Rules\BelongsToCurrentOrganization;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Validator;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('passes for an active membership belonging to the active organization', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    app(CurrentOrganization::class)->set($organization->id);

    $validator = Validator::make(
        ['membership_id' => $membership->id],
        ['membership_id' => [new BelongsToCurrentOrganization(Membership::class, ['status' => MembershipStatus::Active])]],
    );

    expect($validator->passes())->toBeTrue();
});

test('fails for a membership belonging to another organization (CU-33)', function () {
    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();
    $membership = Membership::factory()->create(['organization_id' => $organizationB->id]);

    app(CurrentOrganization::class)->set($organizationA->id);

    $validator = Validator::make(
        ['membership_id' => $membership->id],
        ['membership_id' => [new BelongsToCurrentOrganization(Membership::class)]],
    );

    expect($validator->fails())->toBeTrue();
});

test('fails for a membership in the active organization that does not match the extra condition', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->create([
        'organization_id' => $organization->id,
        'status' => MembershipStatus::Inactive,
    ]);

    app(CurrentOrganization::class)->set($organization->id);

    $validator = Validator::make(
        ['membership_id' => $membership->id],
        ['membership_id' => [new BelongsToCurrentOrganization(Membership::class, ['status' => MembershipStatus::Active])]],
    );

    expect($validator->fails())->toBeTrue();
});

test('passes for a service belonging to the active organization and fails for one from another', function () {
    $organizationA = Organization::factory()->create();
    $organizationB = Organization::factory()->create();
    $serviceA = Service::factory()->create(['organization_id' => $organizationA->id]);
    $serviceB = Service::factory()->create(['organization_id' => $organizationB->id]);

    app(CurrentOrganization::class)->set($organizationA->id);

    $passing = Validator::make(
        ['service_id' => $serviceA->id],
        ['service_id' => [new BelongsToCurrentOrganization(Service::class)]],
    );
    $failing = Validator::make(
        ['service_id' => $serviceB->id],
        ['service_id' => [new BelongsToCurrentOrganization(Service::class)]],
    );

    expect($passing->passes())->toBeTrue();
    expect($failing->fails())->toBeTrue();
});

test('fails for an id that does not exist', function () {
    $organization = Organization::factory()->create();
    app(CurrentOrganization::class)->set($organization->id);

    $validator = Validator::make(
        ['membership_id' => 999999],
        ['membership_id' => [new BelongsToCurrentOrganization(Membership::class)]],
    );

    expect($validator->fails())->toBeTrue();
});

test('fails when there is no active organization', function () {
    $membership = Membership::factory()->create();

    $validator = Validator::make(
        ['membership_id' => $membership->id],
        ['membership_id' => [new BelongsToCurrentOrganization(Membership::class)]],
    );

    expect($validator->fails())->toBeTrue();
});
