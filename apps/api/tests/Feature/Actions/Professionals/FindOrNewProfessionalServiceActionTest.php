<?php

declare(strict_types=1);

use App\Actions\Professionals\FindOrNewProfessionalServiceAction;
use App\Data\Professionals\ProfessionalServiceAssignmentData;
use App\Models\Membership;
use App\Models\ProfessionalService;
use App\Models\Service;

test('returns the existing persisted professional service for that membership and service', function () {
    $membership = Membership::factory()->create();
    $service = Service::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => $service->id,
    ]);

    $dto = new ProfessionalServiceAssignmentData(
        organizationId: $membership->organization_id,
        membershipId: $membership->id,
        serviceId: $service->id,
        durationMinutes: 30,
        priceCents: 15000,
        active: true,
    );

    $found = app(FindOrNewProfessionalServiceAction::class)->handle($dto);

    expect($found->exists)->toBeTrue();
    expect($found->id)->toBe($professionalService->id);
});

test('returns a new unsaved instance when none exists', function () {
    $membership = Membership::factory()->create();
    $service = Service::factory()->create();

    $dto = new ProfessionalServiceAssignmentData(
        organizationId: $membership->organization_id,
        membershipId: $membership->id,
        serviceId: $service->id,
        durationMinutes: 30,
        priceCents: 15000,
        active: true,
    );

    $found = app(FindOrNewProfessionalServiceAction::class)->handle($dto);

    expect($found->exists)->toBeFalse();
    expect($found->organization_id)->toBe($membership->organization_id);
    expect($found->membership_id)->toBe($membership->id);
});

test('does not return a professional service belonging to a different membership for the same service', function () {
    $membership = Membership::factory()->create();
    $otherMembership = Membership::factory()->create();
    $service = Service::factory()->create();
    ProfessionalService::factory()->create([
        'organization_id' => $otherMembership->organization_id,
        'membership_id' => $otherMembership->id,
        'service_id' => $service->id,
    ]);

    $dto = new ProfessionalServiceAssignmentData(
        organizationId: $membership->organization_id,
        membershipId: $membership->id,
        serviceId: $service->id,
        durationMinutes: 30,
        priceCents: 15000,
        active: true,
    );

    $found = app(FindOrNewProfessionalServiceAction::class)->handle($dto);

    expect($found->exists)->toBeFalse();
    expect($found->membership_id)->toBe($membership->id);
});
