<?php

declare(strict_types=1);

use App\Models\InsuranceProvider;
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

test('q matches the insurance member number regardless of its separators', function (string $term) {
    $membership = Membership::factory()->create();
    $provider = InsuranceProvider::factory()->create();

    $match = Patient::factory()->create([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '37-415820/01',
    ]);
    $match->organizations()->attach($membership->organization_id);

    $noMatch = Patient::factory()->create([
        'insurance_provider_id' => $provider->id,
        'insurance_member_number' => '99-000000/01',
    ]);
    $noMatch->organizations()->attach($membership->organization_id);

    $response = $this->actingAs($membership->user)->getJson('/api/v1/patients?q='.urlencode($term));

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($match->id);
    expect($ids)->not->toContain($noMatch->id);
})->with(['37-415820/01', '3741582001', '415820 01']);

test('q made only of separators does not match every patient with a member number', function () {
    $membership = Membership::factory()->create();

    $patient = Patient::factory()->create([
        'name' => 'Maria Gonzalez',
        'document_number' => '30123456',
        'insurance_provider_id' => InsuranceProvider::factory()->create()->id,
        'insurance_member_number' => '37-415820/01',
    ]);
    $patient->organizations()->attach($membership->organization_id);

    $response = $this->actingAs($membership->user)->getJson('/api/v1/patients?q=%2F');

    $response->assertOk();
    expect($response->json('data'))->toBe([]);
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

// The cards view loads the list page after page (#306): a tie on the name must
// not move a patient across pages, or one repeats and another never shows.
test('paginating through patients who share a name breaks ties by id without skipping or repeating rows', function () {
    $membership = Membership::factory()->create();

    $ids = collect(range(1, 6))->map(function () use ($membership) {
        $patient = Patient::factory()->create(['name' => 'Ana Pérez']);
        $patient->organizations()->attach($membership->organization_id);

        return $patient->id;
    });
    // Rewriting the rows in reverse puts them on disk against their id order,
    // so nothing but an explicit tie-break can hand them back by id.
    $ids->reverse()->each(fn (int $id) => Patient::query()->whereKey($id)->update(['birth_date' => '1990-01-01']));

    $seenIds = collect(range(1, $ids->count()))->map(function (int $page) use ($membership) {
        $response = $this->actingAs($membership->user)->getJson("/api/v1/patients?per_page=1&page={$page}");
        $response->assertOk();

        return $response->json('data.0.id');
    });

    expect($seenIds->all())->toBe($ids->sort()->values()->all());
});
