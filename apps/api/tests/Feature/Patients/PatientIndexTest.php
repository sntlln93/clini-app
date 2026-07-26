<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\User;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('index returns only patients linked to the active organization', function () {
    $membership = Membership::factory()->create();
    $otherOrganization = Organization::factory()->create();

    $linked = Patient::factory()->create();
    $linked->organizations()->attach($membership->organization_id);

    $otherOrgOnly = Patient::factory()->create();
    $otherOrgOnly->organizations()->attach($otherOrganization->id);

    $unlinked = Patient::factory()->create();

    $response = $this->actingAs($membership->user)->getJson('/api/v1/patients');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($linked->id);
    expect($ids)->not->toContain($otherOrgOnly->id);
    expect($ids)->not->toContain($unlinked->id);
});

test('q matches part of the name, case-insensitively', function () {
    $membership = Membership::factory()->create();

    $match = Patient::factory()->create(['name' => 'Maria Gonzalez']);
    $match->organizations()->attach($membership->organization_id);

    $noMatch = Patient::factory()->create(['name' => 'Carlos Perez']);
    $noMatch->organizations()->attach($membership->organization_id);

    $response = $this->actingAs($membership->user)->getJson('/api/v1/patients?q=GONZA');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($match->id);
    expect($ids)->not->toContain($noMatch->id);
});

test('q matches part of the document number', function () {
    $membership = Membership::factory()->create();

    $match = Patient::factory()->create(['document_number' => '30123456']);
    $match->organizations()->attach($membership->organization_id);

    $noMatch = Patient::factory()->create(['document_number' => '40999999']);
    $noMatch->organizations()->attach($membership->organization_id);

    $response = $this->actingAs($membership->user)->getJson('/api/v1/patients?q=123456');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($match->id);
    expect($ids)->not->toContain($noMatch->id);
});

test('per_page over 12 linked patients returns the page size and the correct total', function () {
    $membership = Membership::factory()->create();

    $patients = Patient::factory()->count(12)->create();
    foreach ($patients as $patient) {
        $patient->organizations()->attach($membership->organization_id);
    }

    $response = $this->actingAs($membership->user)->getJson('/api/v1/patients?per_page=5');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(5);
    expect($response->json('meta.total'))->toBe(12);
});

test('a guest gets 401', function () {
    $response = $this->getJson('/api/v1/patients');

    $response->assertStatus(401);
});

test('a user with no active membership gets a 403', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/patients');

    $response->assertStatus(403);
});
