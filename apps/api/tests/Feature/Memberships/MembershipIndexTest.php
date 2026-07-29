<?php

declare(strict_types=1);

use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('paginates 15 per page by default', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    Membership::factory()->count(20)->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($owner->user)->getJson('/api/v1/memberships');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(15);
    expect($response->json('meta.total'))->toBe(21);
    expect($response->json('meta.current_page'))->toBe(1);
    expect($response->json('meta.last_page'))->toBe(2);
});

test('per_page is respected and returns the correct page size and total', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    Membership::factory()->count(9)->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($owner->user)->getJson('/api/v1/memberships?per_page=5');

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(5);
    expect($response->json('meta.total'))->toBe(10);
});

test('per_page above the validated maximum returns 422', function () {
    $owner = Membership::factory()->owner()->create();

    $response = $this->actingAs($owner->user)->getJson('/api/v1/memberships?per_page=101');

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('per_page');
});

test('per_page of 0 returns 422', function () {
    $owner = Membership::factory()->owner()->create();

    $response = $this->actingAs($owner->user)->getJson('/api/v1/memberships?per_page=0');

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('per_page');
});

test('q matches part of the membership user\'s name, case-insensitively', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $matchUser = User::factory()->create(['name' => 'Maria Gonzalez']);
    $match = Membership::factory()->create(['organization_id' => $organization->id, 'user_id' => $matchUser->id]);

    $noMatchUser = User::factory()->create(['name' => 'Carlos Perez']);
    $noMatch = Membership::factory()->create(['organization_id' => $organization->id, 'user_id' => $noMatchUser->id]);

    $response = $this->actingAs($owner->user)->getJson('/api/v1/memberships?q=GONZA');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($match->id);
    expect($ids)->not->toContain($noMatch->id);
});

test('q matches part of the membership user\'s email', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $matchUser = User::factory()->create(['email' => 'unique.match@example.com']);
    $match = Membership::factory()->create(['organization_id' => $organization->id, 'user_id' => $matchUser->id]);

    $noMatchUser = User::factory()->create(['email' => 'someone.else@example.com']);
    $noMatch = Membership::factory()->create(['organization_id' => $organization->id, 'user_id' => $noMatchUser->id]);

    $response = $this->actingAs($owner->user)->getJson('/api/v1/memberships?q=unique.match');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($match->id);
    expect($ids)->not->toContain($noMatch->id);
});

test('q with no matches returns an empty data set and a zero total', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    Membership::factory()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($owner->user)->getJson('/api/v1/memberships?q=zzzznomatchzzzz');

    $response->assertOk();
    expect($response->json('data'))->toBe([]);
    expect($response->json('meta.total'))->toBe(0);
});

test('soft-deleted memberships are still included in the index', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $target = Membership::factory()->staff()->create(['organization_id' => $organization->id]);
    $target->delete();

    $response = $this->actingAs($owner->user)->getJson('/api/v1/memberships');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->toContain($target->id);
});

test('q does not leak a matching user from another organization', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $otherOrgUser = User::factory()->create(['name' => 'Unique Match Name']);
    $otherOrgMembership = Membership::factory()->create(['user_id' => $otherOrgUser->id]);

    $response = $this->actingAs($owner->user)->getJson('/api/v1/memberships?q=Unique Match');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids)->not->toContain($otherOrgMembership->id);
    expect($response->json('meta.total'))->toBe(0);
});

test('withQueryString preserves q across the returned pagination links', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    collect(range(1, 3))->each(function (int $i) use ($organization) {
        $user = User::factory()->create(['name' => "SearchMe {$i}"]);
        Membership::factory()->create(['organization_id' => $organization->id, 'user_id' => $user->id]);
    });

    $response = $this->actingAs($owner->user)->getJson('/api/v1/memberships?q=SearchMe&per_page=1&page=2');

    $response->assertOk();
    expect($response->json('meta.total'))->toBe(3);
    expect($response->json('meta.current_page'))->toBe(2);
    expect($response->json('links.first'))->toContain('q=SearchMe');
    expect($response->json('links.last'))->toContain('q=SearchMe');
});

test('paginating through tied created_at breaks ties by id without skipping or repeating rows', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $tiedInstant = now();
    $tied = Membership::factory()->count(5)->create([
        'organization_id' => $organization->id,
        'created_at' => $tiedInstant,
    ]);

    $allIds = collect([$owner->id])->merge($tied->pluck('id'))->sort()->values();

    $firstResponse = $this->actingAs($owner->user)->getJson('/api/v1/memberships?per_page=1');
    $firstResponse->assertOk();
    $lastPage = $firstResponse->json('meta.last_page');
    expect($lastPage)->toBe($allIds->count());

    $seenIds = collect();
    for ($page = 1; $page <= $lastPage; $page++) {
        $pageResponse = $this->actingAs($owner->user)->getJson("/api/v1/memberships?per_page=1&page={$page}");
        $pageResponse->assertOk();
        $seenIds->push($pageResponse->json('data.0.id'));
    }

    expect($seenIds->unique()->count())->toBe($allIds->count());
    expect($seenIds->sort()->values()->all())->toBe($allIds->all());
});
