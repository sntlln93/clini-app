<?php

declare(strict_types=1);

use App\Enums\MembershipStatus;
use App\Enums\SubscriptionStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Subscription;
use Carbon\CarbonImmutable;

afterEach(function () {
    freshRequestState();
});

test('the list is a standard pagination envelope, 15 per page by default, with per_page capped at 100', function () {
    Organization::factory()->count(17)->create();

    $response = actingAsAdmin()->getJson('/api/v1/admin/organizations');

    $response->assertOk()->assertJsonStructure([
        'data' => [['id', 'name', 'slug', 'timezone', 'created_at', 'suspended_at', 'suspension_reason', 'active_members_count', 'subscription']],
        'links' => ['first', 'last', 'prev', 'next'],
        'meta' => ['current_page', 'last_page', 'per_page', 'total'],
    ]);
    expect($response->json('data'))->toHaveCount(15);
    expect($response->json('meta.total'))->toBe(17);
    expect($response->json('meta.last_page'))->toBe(2);

    freshRequestState();
    actingAsAdmin()->getJson('/api/v1/admin/organizations?per_page=101')
        ->assertStatus(422)
        ->assertJsonValidationErrors(['per_page']);
});

test('q matches name or slug case-insensitively', function () {
    Organization::factory()->create(['name' => 'Clínica Norte', 'slug' => 'clinica-norte']);
    Organization::factory()->create(['name' => 'Consultorio Sur', 'slug' => 'sur-salud']);
    Organization::factory()->create(['name' => 'Otro', 'slug' => 'otro']);

    $byName = actingAsAdmin()->getJson('/api/v1/admin/organizations?q=NORTE');
    expect(array_column($byName->json('data'), 'slug'))->toBe(['clinica-norte']);

    freshRequestState();
    $bySlug = actingAsAdmin()->getJson('/api/v1/admin/organizations?q=SALUD');
    expect(array_column($bySlug->json('data'), 'slug'))->toBe(['sur-salud']);
});

test('status and subscription_status filter the list', function () {
    $suspended = Organization::factory()->create(['slug' => 'suspendida']);
    $suspended->forceFill(['suspended_at' => now(), 'suspension_reason' => 'Deuda'])->save();
    $inGrace = Organization::factory()->create(['slug' => 'en-gracia']);
    Subscription::factory()->inGrace(now()->addDays(2))->create(['organization_id' => $inGrace->id]);
    $active = Organization::factory()->create(['slug' => 'activa']);
    Subscription::factory()->withStatus(SubscriptionStatus::Active)->create(['organization_id' => $active->id]);

    $slugs = fn (string $query): array => array_column(actingAsAdmin()->getJson('/api/v1/admin/organizations?'.$query)->json('data'), 'slug');

    expect($slugs('status=suspended'))->toBe(['suspendida']);
    freshRequestState();
    expect($slugs('status=active'))->toEqualCanonicalizing(['activa', 'en-gracia']);
    freshRequestState();
    expect($slugs('subscription_status=none'))->toBe(['suspendida']);
    freshRequestState();
    expect($slugs('subscription_status=grace'))->toBe(['en-gracia']);
    freshRequestState();
    actingAsAdmin()->getJson('/api/v1/admin/organizations?status=paused')->assertStatus(422)->assertJsonValidationErrors(['status']);
});

test('the list sorts by created_at desc by default, and by name asc when asked', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01 10:00:00'));
    Organization::factory()->create(['name' => 'Beta', 'slug' => 'beta']);
    $this->travelTo(CarbonImmutable::parse('2026-10-02 10:00:00'));
    Organization::factory()->create(['name' => 'Alfa', 'slug' => 'alfa']);
    $this->travelTo(CarbonImmutable::parse('2026-10-03 10:00:00'));
    Organization::factory()->create(['name' => 'Gamma', 'slug' => 'gamma']);

    $slugs = fn (string $query): array => array_column(actingAsAdmin()->getJson('/api/v1/admin/organizations?'.$query)->json('data'), 'slug');

    expect($slugs(''))->toBe(['gamma', 'alfa', 'beta']);
    freshRequestState();
    expect($slugs('direction=asc'))->toBe(['beta', 'alfa', 'gamma']);
    freshRequestState();
    expect($slugs('sort=name'))->toBe(['alfa', 'beta', 'gamma']);
    freshRequestState();
    expect($slugs('sort=name&direction=desc'))->toBe(['gamma', 'beta', 'alfa']);
});

test('active_members_count ignores inactive and soft-deleted memberships, and the subscription mini shape is exposed', function () {
    $organization = Organization::factory()->create();
    Membership::factory()->count(2)->create(['organization_id' => $organization->id]);
    Membership::factory()->create(['organization_id' => $organization->id, 'status' => MembershipStatus::Inactive]);
    Membership::factory()->create(['organization_id' => $organization->id])->delete();
    Subscription::factory()->inGrace(CarbonImmutable::parse('2026-10-10 12:00:00', 'UTC'))->create(['organization_id' => $organization->id]);

    $item = actingAsAdmin()->getJson('/api/v1/admin/organizations')->json('data.0');

    expect($item['active_members_count'])->toBe(2);
    expect($item['subscription'])->toBe(['status' => 'grace', 'grace_ends_at' => '2026-10-10T12:00:00+00:00']);
});

test('soft-deleted organizations are not listed', function () {
    Organization::factory()->create(['slug' => 'viva']);
    Organization::factory()->create(['slug' => 'borrada'])->delete();

    $slugs = array_column(actingAsAdmin()->getJson('/api/v1/admin/organizations')->json('data'), 'slug');

    expect($slugs)->toBe(['viva']);
});
