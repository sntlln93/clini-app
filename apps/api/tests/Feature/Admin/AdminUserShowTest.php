<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Carbon\CarbonImmutable;

afterEach(function () {
    freshRequestState();
});

test('show lists the user\'s live memberships newest first, with their organization ref', function () {
    $user = User::factory()->create();
    $this->travelTo(CarbonImmutable::parse('2026-10-01 10:00:00', 'UTC'));
    $suspended = Organization::factory()->create(['name' => 'Suspendida', 'slug' => 'suspendida']);
    $suspended->forceFill(['suspended_at' => CarbonImmutable::parse('2026-10-03 09:00:00', 'UTC'), 'suspension_reason' => 'Deuda'])->save();
    $older = Membership::factory()->owner()->create(['user_id' => $user->id, 'organization_id' => $suspended->id]);
    $this->travelTo(CarbonImmutable::parse('2026-10-02 10:00:00', 'UTC'));
    $newer = Membership::factory()->professional()->create(['user_id' => $user->id]);
    Membership::factory()->create(['user_id' => $user->id])->delete();
    $deletedOrganization = Organization::factory()->create();
    Membership::factory()->create(['user_id' => $user->id, 'organization_id' => $deletedOrganization->id]);
    $deletedOrganization->delete();

    $response = actingAsAdmin()->getJson("/api/v1/admin/users/{$user->id}");

    $response->assertOk();
    expect($response->json('data.memberships_count'))->toBe(2);
    expect(array_column($response->json('data.memberships'), 'id'))->toBe([$newer->id, $older->id]);
    expect($response->json('data.memberships.1'))->toBe([
        'id' => $older->id,
        'organization' => ['id' => $suspended->id, 'name' => 'Suspendida', 'slug' => 'suspendida', 'suspended_at' => '2026-10-03T09:00:00+00:00'],
        'roles' => [MembershipRole::Owner->value],
        'status' => 'active',
        'created_at' => '2026-10-01T10:00:00+00:00',
    ]);
});

test('show is 404 for an unknown user', function () {
    actingAsAdmin()->getJson('/api/v1/admin/users/999999')->assertNotFound();
});
