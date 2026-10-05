<?php

declare(strict_types=1);

use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use Carbon\CarbonImmutable;

afterEach(function () {
    freshRequestState();
});

/**
 * @return array<int, string>
 */
function listedUserEmails(string $query = ''): array
{
    return array_column(actingAsAdmin()->getJson('/api/v1/admin/users'.($query === '' ? '' : '?'.$query))->json('data'), 'email');
}

test('q matches name or email case-insensitively', function () {
    User::factory()->create(['name' => 'Ana Pérez', 'email' => 'ana@clini.test']);
    User::factory()->create(['name' => 'Bruno Díaz', 'email' => 'bruno@SALUD.test']);
    User::factory()->create(['name' => 'Carla', 'email' => 'carla@clini.test']);

    expect(listedUserEmails('q=PÉREZ'))->toBe(['ana@clini.test']);
    freshRequestState();
    expect(listedUserEmails('q=salud'))->toBe(['bruno@SALUD.test']);
});

test('verified and blocked filter the list', function () {
    User::factory()->create(['email' => 'verificado@clini.test']);
    User::factory()->unverified()->create(['email' => 'sin-verificar@clini.test']);
    User::factory()->create(['email' => 'bloqueado@clini.test'])
        ->forceFill(['blocked_at' => now(), 'block_reason' => 'Abuso'])->save();

    expect(listedUserEmails('verified=false'))->toBe(['sin-verificar@clini.test']);
    freshRequestState();
    expect(listedUserEmails('verified=true'))->toEqualCanonicalizing(['verificado@clini.test', 'bloqueado@clini.test']);
    freshRequestState();
    expect(listedUserEmails('blocked=true'))->toBe(['bloqueado@clini.test']);
    freshRequestState();
    expect(listedUserEmails('blocked=false'))->toEqualCanonicalizing(['verificado@clini.test', 'sin-verificar@clini.test']);
    freshRequestState();
    actingAsAdmin()->getJson('/api/v1/admin/users?verified=yes')->assertStatus(422)->assertJsonValidationErrors(['verified']);
});

test('the list is ordered newest first and exposes the list shape', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-01 10:00:00', 'UTC'));
    User::factory()->create(['email' => 'primero@clini.test']);
    $this->travelTo(CarbonImmutable::parse('2026-10-02 10:00:00', 'UTC'));
    $latest = User::factory()->create(['email' => 'segundo@clini.test']);
    $latest->forceFill(['blocked_at' => CarbonImmutable::parse('2026-10-02 11:00:00', 'UTC'), 'block_reason' => 'Spam'])->save();

    $response = actingAsAdmin()->getJson('/api/v1/admin/users');

    expect(array_column($response->json('data'), 'email'))->toBe(['segundo@clini.test', 'primero@clini.test']);
    expect($response->json('data.0'))->toBe([
        'id' => $latest->id,
        'name' => $latest->name,
        'email' => 'segundo@clini.test',
        'email_verified_at' => '2026-10-02T10:00:00+00:00',
        'blocked_at' => '2026-10-02T11:00:00+00:00',
        'block_reason' => 'Spam',
        'created_at' => '2026-10-02T10:00:00+00:00',
        'memberships_count' => 0,
    ]);
    expect($response->json('meta.per_page'))->toBe(15);
});

test('memberships_count counts any status but skips soft-deleted memberships and organizations', function () {
    $user = User::factory()->create();
    Membership::factory()->create(['user_id' => $user->id]);
    Membership::factory()->create(['user_id' => $user->id, 'status' => MembershipStatus::Inactive]);
    Membership::factory()->create(['user_id' => $user->id])->delete();
    $deletedOrganization = Organization::factory()->create();
    Membership::factory()->create(['user_id' => $user->id, 'organization_id' => $deletedOrganization->id]);
    $deletedOrganization->delete();

    $item = actingAsAdmin()->getJson('/api/v1/admin/users')->json('data.0');

    expect($item['id'])->toBe($user->id);
    expect($item['memberships_count'])->toBe(2);
});
