<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Service;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('an authenticated user with an active membership gets the services ordered by name', function () {
    $membership = Membership::factory()->create();
    Service::factory()->create(['name' => 'Zeta consulta']);
    Service::factory()->create(['name' => 'Alfa consulta']);

    $response = $this->actingAs($membership->user)->getJson('/api/v1/services');

    $response->assertOk();
    $names = collect($response->json('data'))->pluck('name');
    expect($names->toArray())->toBe($names->sort()->values()->toArray());
    expect($names->first())->toBe('Alfa consulta');
});

test('the index is global: a service created once is visible to users acting from two different organizations', function () {
    $service = Service::factory()->create(['name' => 'Consulta general']);
    $membershipA = Membership::factory()->create();
    $membershipB = Membership::factory()->create();

    $responseA = $this->actingAs($membershipA->user)->getJson('/api/v1/services');

    // Requests within the same test share the CurrentOrganization
    // singleton (unlike production, where each request is a fresh
    // process): without resetting it here, membershipB's own lookup in
    // ResolveCurrentOrganization would be scoped by membershipA's
    // leftover organization and find nothing.
    app(CurrentOrganization::class)->set(null);
    $responseB = $this->actingAs($membershipB->user)->getJson('/api/v1/services');

    $responseA->assertOk();
    $responseB->assertOk();
    expect(collect($responseA->json('data'))->pluck('id'))->toContain($service->id);
    expect(collect($responseB->json('data'))->pluck('id'))->toContain($service->id);
});

test('a guest gets 401', function () {
    $response = $this->getJson('/api/v1/services');

    $response->assertStatus(401);
});

test('POST, PATCH and DELETE on services are not routable', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/services', ['name' => 'Nuevo'])->assertStatus(405);
    $this->actingAs($membership->user)->patchJson('/api/v1/services', ['name' => 'Otro'])->assertStatus(405);
    $this->actingAs($membership->user)->deleteJson('/api/v1/services')->assertStatus(405);
});
