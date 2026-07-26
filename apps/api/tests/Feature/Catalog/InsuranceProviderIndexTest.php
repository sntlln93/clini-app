<?php

declare(strict_types=1);

use App\Models\InsuranceProvider;
use App\Models\Membership;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('an authenticated user with an active membership gets providers ordered by name', function () {
    $membership = Membership::factory()->create();
    InsuranceProvider::factory()->create(['name' => 'Zeta Salud']);
    InsuranceProvider::factory()->create(['name' => 'Alfa Salud']);

    $response = $this->actingAs($membership->user)->getJson('/api/v1/insurance-providers');

    $response->assertOk();
    $names = collect($response->json('data'))->pluck('name');
    expect($names->toArray())->toBe($names->sort()->values()->toArray());
    expect($names->first())->toBe('Alfa Salud');
});

test('a guest gets 401', function () {
    $response = $this->getJson('/api/v1/insurance-providers');

    $response->assertStatus(401);
});

test('POST to insurance-providers is not routable', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/insurance-providers', ['name' => 'Nueva']);

    $response->assertStatus(405);
});
