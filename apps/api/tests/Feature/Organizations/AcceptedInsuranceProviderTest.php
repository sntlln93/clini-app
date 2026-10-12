<?php

declare(strict_types=1);

use App\Models\InsuranceProvider;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('a guest gets 401 on the accepted insurance providers', function () {
    $this->getJson('/api/v1/organization/insurance-providers')->assertStatus(401);
    $this->putJson('/api/v1/organization/insurance-providers', ['insurance_provider_ids' => []])->assertStatus(401);
});

test('a member without organization.manage can neither read nor change them', function (string $role) {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->{$role}()->create(['organization_id' => $organization->id]);
    $provider = InsuranceProvider::factory()->create();

    $this->actingAs($membership->user)->getJson('/api/v1/organization/insurance-providers')->assertStatus(403);
    $this->actingAs($membership->user)
        ->putJson('/api/v1/organization/insurance-providers', ['insurance_provider_ids' => [$provider->id]])
        ->assertStatus(403);

    expect($organization->acceptedInsuranceProviders()->count())->toBe(0);
})->with(['professional', 'staff']);

test('an owner or admin replaces the selection, and only for their own organization', function (string $role) {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->{$role}()->create(['organization_id' => $organization->id]);
    $osde = InsuranceProvider::factory()->create(['name' => 'OSDE']);
    $galeno = InsuranceProvider::factory()->create(['name' => 'Galeno']);
    $ioma = InsuranceProvider::factory()->create(['name' => 'IOMA']);
    $organization->acceptedInsuranceProviders()->attach($ioma->id);
    $other = Organization::factory()->create();
    $other->acceptedInsuranceProviders()->attach($ioma->id);

    $this->actingAs($membership->user)
        ->putJson('/api/v1/organization/insurance-providers', ['insurance_provider_ids' => [$osde->id, $galeno->id]])
        ->assertOk()
        ->assertJsonPath('data', [
            ['id' => $galeno->id, 'name' => 'Galeno'],
            ['id' => $osde->id, 'name' => 'OSDE'],
        ]);

    $this->actingAs($membership->user)
        ->getJson('/api/v1/organization/insurance-providers')
        ->assertOk()
        ->assertJsonPath('data.*.id', [$galeno->id, $osde->id]);
    expect($other->acceptedInsuranceProviders()->pluck('insurance_providers.id')->all())->toBe([$ioma->id]);
})->with(['owner', 'admin']);

test('an empty list clears the selection', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $organization->acceptedInsuranceProviders()->attach(InsuranceProvider::factory()->create()->id);

    $this->actingAs($owner->user)
        ->putJson('/api/v1/organization/insurance-providers', ['insurance_provider_ids' => []])
        ->assertOk()
        ->assertJsonPath('data', []);

    expect($organization->acceptedInsuranceProviders()->count())->toBe(0);
});

test('an unknown provider, a repeated one or a missing list is rejected with 422', function (array $payload, string $field) {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $provider = InsuranceProvider::factory()->create();

    $this->actingAs($owner->user)
        ->putJson('/api/v1/organization/insurance-providers', $payload === ['repeat'] ? ['insurance_provider_ids' => [$provider->id, $provider->id]] : $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors([$field]);
})->with([
    'unknown' => [['insurance_provider_ids' => [999999]], 'insurance_provider_ids.0'],
    'repeated' => [['repeat'], 'insurance_provider_ids.0'],
    'missing' => [[], 'insurance_provider_ids'],
]);
