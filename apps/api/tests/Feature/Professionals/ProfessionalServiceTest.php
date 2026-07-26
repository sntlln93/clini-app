<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Organization;
use App\Models\ProfessionalService;
use App\Models\Service;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('store assigns a service with duration_minutes and price_cents and persists both', function () {
    $membership = Membership::factory()->create();
    $service = Service::factory()->create();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => 30,
        'price_cents' => 15000,
    ]);

    $response->assertCreated();
    $row = DB::table('professional_services')
        ->where('membership_id', $membership->id)
        ->where('service_id', $service->id)
        ->first();
    expect($row->duration_minutes)->toBe(30);
    expect($row->price_cents)->toBe(15000);
});

test('store of the same service twice updates the existing row instead of duplicating it', function () {
    $membership = Membership::factory()->create();
    $service = Service::factory()->create();

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => 30,
        'price_cents' => 15000,
    ])->assertCreated();

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => 45,
        'price_cents' => 20000,
    ])->assertCreated();

    expect(
        DB::table('professional_services')
            ->where('membership_id', $membership->id)
            ->where('service_id', $service->id)
            ->count()
    )->toBe(1);
    $row = DB::table('professional_services')
        ->where('membership_id', $membership->id)
        ->where('service_id', $service->id)
        ->first();
    expect($row->duration_minutes)->toBe(45);
    expect($row->price_cents)->toBe(20000);
});

test('store without duration_minutes returns 422', function () {
    $membership = Membership::factory()->create();
    $service = Service::factory()->create();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/services", [
        'service_id' => $service->id,
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('duration_minutes');
});

test('store with duration_minutes of 0 or negative returns 422', function () {
    $membership = Membership::factory()->create();
    $service = Service::factory()->create();

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => 0,
    ])->assertStatus(422)->assertJsonValidationErrors('duration_minutes');

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => -10,
    ])->assertStatus(422)->assertJsonValidationErrors('duration_minutes');
});

test('store with price_cents explicitly null succeeds', function () {
    $membership = Membership::factory()->create();
    $service = Service::factory()->create();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => 30,
        'price_cents' => null,
    ]);

    $response->assertCreated();
    expect(
        DB::table('professional_services')
            ->where('membership_id', $membership->id)
            ->where('service_id', $service->id)
            ->value('price_cents')
    )->toBeNull();
});

test('store with a negative price_cents returns 422', function () {
    $membership = Membership::factory()->create();
    $service = Service::factory()->create();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => 30,
        'price_cents' => -100,
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('price_cents');
});

test('currency is never settable from the request', function () {
    $membership = Membership::factory()->create();
    $service = Service::factory()->create();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => 30,
        'price_cents' => 15000,
        'currency' => 'USD',
    ]);

    $response->assertCreated();
    expect(
        DB::table('professional_services')
            ->where('membership_id', $membership->id)
            ->where('service_id', $service->id)
            ->value('currency')
    )->toBe('ARS');
});

test('store on a membership belonging to another organization returns 422', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();
    $service = Service::factory()->create();

    $response = $this->actingAs($owner->user)->postJson("/api/v1/memberships/{$otherOrgMembership->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => 30,
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('membership_id');
});

test('index on a membership of another organization is rejected', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();
    ProfessionalService::factory()->create([
        'organization_id' => $otherOrgMembership->organization_id,
        'membership_id' => $otherOrgMembership->id,
    ]);

    $response = $this->actingAs($owner->user)->getJson("/api/v1/memberships/{$otherOrgMembership->id}/services");

    $response->assertStatus(403);
});

test('update changes duration_minutes and price_cents on an existing assignment', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'duration_minutes' => 20,
        'price_cents' => 5000,
    ]);

    $response = $this->actingAs($membership->user)->patchJson(
        "/api/v1/memberships/{$membership->id}/services/{$professionalService->service_id}",
        [
            'service_id' => $professionalService->service_id,
            'duration_minutes' => 60,
            'price_cents' => 30000,
        ]
    );

    $response->assertOk();
    $row = DB::table('professional_services')->where('id', $professionalService->id)->first();
    expect($row->duration_minutes)->toBe(60);
    expect($row->price_cents)->toBe(30000);
});

test('destroy unassigns the service', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $response = $this->actingAs($membership->user)->deleteJson(
        "/api/v1/memberships/{$membership->id}/services/{$professionalService->service_id}"
    );

    $response->assertNoContent();
    expect(
        DB::table('professional_services')->where('id', $professionalService->id)->count()
    )->toBe(0);
});

test('authorization matrix on store: owner on any member succeeds, professional on own succeeds, professional on another 403, staff 403', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $anotherMember = Membership::factory()->create(['organization_id' => $organization->id]);
    $staff = Membership::factory()->staff()->create(['organization_id' => $organization->id]);
    $service = Service::factory()->create();

    $this->actingAs($owner->user)->postJson("/api/v1/memberships/{$anotherMember->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => 30,
    ])->assertCreated();

    $this->actingAs($professional->user)->postJson("/api/v1/memberships/{$professional->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => 30,
    ])->assertCreated();

    $this->actingAs($professional->user)->postJson("/api/v1/memberships/{$anotherMember->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => 30,
    ])->assertStatus(403);

    $this->actingAs($staff->user)->postJson("/api/v1/memberships/{$staff->id}/services", [
        'service_id' => $service->id,
        'duration_minutes' => 30,
    ])->assertStatus(403);
});

test('a guest gets 401 on index, store, update and destroy', function () {
    $membership = Membership::factory()->create();
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $this->getJson("/api/v1/memberships/{$membership->id}/services")->assertStatus(401);
    $this->postJson("/api/v1/memberships/{$membership->id}/services", [
        'service_id' => $professionalService->service_id,
        'duration_minutes' => 30,
    ])->assertStatus(401);
    $this->patchJson("/api/v1/memberships/{$membership->id}/services/{$professionalService->service_id}", [
        'service_id' => $professionalService->service_id,
        'duration_minutes' => 30,
    ])->assertStatus(401);
    $this->deleteJson("/api/v1/memberships/{$membership->id}/services/{$professionalService->service_id}")->assertStatus(401);
});
