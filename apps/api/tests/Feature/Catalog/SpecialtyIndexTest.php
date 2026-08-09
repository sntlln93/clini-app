<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Specialty;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('an authenticated user with an active membership gets the specialties ordered by name', function () {
    $membership = Membership::factory()->create();
    Specialty::factory()->create(['name' => 'Zeta']);
    Specialty::factory()->create(['name' => 'Alfa']);

    $response = $this->actingAs($membership->user)->getJson('/api/v1/specialties');

    $response->assertOk();
    $names = collect($response->json('data'))->pluck('name');
    expect($names->toArray())->toBe($names->sort()->values()->toArray());
    expect($names->first())->toBe('Alfa');
});

test('the index is global: a specialty created once is visible to users acting from two different organizations', function () {
    $specialty = Specialty::factory()->create(['name' => 'Cardiología']);
    $membershipA = Membership::factory()->create();
    $membershipB = Membership::factory()->create();

    $responseA = $this->actingAs($membershipA->user)->getJson('/api/v1/specialties');

    // Tests share the CurrentOrganization singleton across requests (unlike production); without resetting it, membershipB's lookup would stay scoped to membershipA's leftover organization and find nothing.
    app(CurrentOrganization::class)->set(null);
    $responseB = $this->actingAs($membershipB->user)->getJson('/api/v1/specialties');

    $responseA->assertOk();
    $responseB->assertOk();
    expect(collect($responseA->json('data'))->pluck('id'))->toContain($specialty->id);
    expect(collect($responseB->json('data'))->pluck('id'))->toContain($specialty->id);
});

test('a guest gets 401', function () {
    $response = $this->getJson('/api/v1/specialties');

    $response->assertStatus(401);
});

test('POST, PATCH and DELETE on specialties are not routable', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/specialties', ['name' => 'Nueva'])->assertStatus(405);
    $this->actingAs($membership->user)->patchJson('/api/v1/specialties', ['name' => 'Otra'])->assertStatus(405);
    $this->actingAs($membership->user)->deleteJson('/api/v1/specialties')->assertStatus(405);
});
