<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('a guest gets 401 on PATCH /memberships/me/slug', function () {
    $this->patchJson('/api/v1/memberships/me/slug', ['slug' => 'algun-slug'])->assertStatus(401);
});

test('a professional sets a valid slug: 200, persisted on their own membership, and the response exposes slug', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => 'dra-lopez',
    ]);

    $response->assertOk();
    expect($response->json('data.slug'))->toBe('dra-lopez');
    $membership->refresh();
    expect($membership->slug)->toBe('dra-lopez');
});

test('invalid slug formats return 409 memberships.slug_invalid_format, never 422', function (string $invalidSlug) {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => $invalidSlug,
    ]);

    $response->assertStatus(409);
    expect($response->status())->not->toBe(422);
    $response->assertJsonPath('error.code', ErrorCode::MembershipsSlugInvalidFormat->value);
})->with([
    'uppercase and space' => ['Dr Gomez'],
    'underscore' => ['dr_gomez'],
    'leading hyphen' => ['-dr-gomez'],
    'double hyphen' => ['dr--gomez'],
    'too short' => ['ab'],
]);

test('a slug equal to an existing organizations.slug returns 409 memberships.slug_taken', function () {
    $organization = Organization::factory()->create();
    $takenOrganization = Organization::factory()->create(['slug' => 'consultorio-salud']);
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => $takenOrganization->slug,
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', ErrorCode::MembershipsSlugTaken->value);
});

test('a slug already used by another membership in a different organization returns 409 memberships.slug_taken', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $otherOrganization = Organization::factory()->create();
    Membership::factory()->professional()->create([
        'organization_id' => $otherOrganization->id,
        'slug' => 'dr-gomez',
    ]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => 'dr-gomez',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', ErrorCode::MembershipsSlugTaken->value);
});

test('re-saving the membership\'s own current slug returns 200: a membership never collides with itself', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'slug' => 'dr-gomez',
    ]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => 'dr-gomez',
    ]);

    $response->assertOk();
    $membership->refresh();
    expect($membership->slug)->toBe('dr-gomez');
});

test('sending slug null or an empty string clears the slug and returns 200', function (?string $clearingValue) {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'slug' => 'dr-gomez',
    ]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => $clearingValue,
    ]);

    $response->assertOk();
    $membership->refresh();
    expect($membership->slug)->toBeNull();
})->with([
    'null' => [null],
    'empty string' => [''],
]);

test('a membership without the professional role gets 409 memberships.slug_not_allowed_for_role', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->staff()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => 'staff-slug',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', ErrorCode::MembershipsSlugNotAllowedForRole->value);
});

test('the endpoint only ever touches the caller\'s own membership', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $otherMembership = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'slug' => 'otro-profesional',
    ]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => 'mi-slug',
    ]);

    $response->assertOk();
    $otherMembership->refresh();
    expect($otherMembership->slug)->toBe('otro-profesional');
});

test('a slug longer than 50 characters returns 422', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $response = $this->actingAs($membership->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => str_repeat('a', 51),
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('slug');
});

test('two concurrent claims for the same slug are serialized by the advisory lock: the second fails with 409, exactly one membership keeps it', function () {
    $organization = Organization::factory()->create();
    $membershipA = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    // Same organization as membershipA: the CurrentOrganization singleton
    // set by ResolveCurrentOrganization for the first request is not reset
    // between two actingAs()->patchJson() calls made within the same test
    // (it only resets in afterEach, once the whole test is done), so a
    // second membership from a *different* organization would spuriously
    // 403 with organizations.no_active_membership here — a global-scope
    // artefact of this test issuing two requests in one test, not
    // something the race itself needs to exercise.
    $membershipB = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $slug = 'dra-concurrente';

    // A genuinely separate database session (its own PDO connection, own
    // Postgres backend) — not this test's RefreshDatabase transaction —
    // so its lock probe below observes the real lock state held by the
    // main request's still-open transaction, not just this connection
    // talking to itself.
    $config = config('database.connections.pgsql');
    $race = new PDO(
        sprintf('pgsql:host=%s;port=%s;dbname=%s', $config['host'], $config['port'], $config['database']),
        $config['username'],
        $config['password']
    );

    $lockHeldByAnotherSession = null;

    Membership::updating(function (Membership $membership) use (&$lockHeldByAnotherSession, $race, $slug, $membershipA) {
        if ($membership->getKey() !== $membershipA->id) {
            return;
        }

        // Fires while this request's own transaction still holds
        // pg_advisory_xact_lock(hashtext($slug)) — acquired right before
        // isTaken() in SetMembershipSlugAction, and released only at
        // COMMIT. pg_try_advisory_xact_lock is non-blocking: on a
        // genuinely separate session it returns immediately, so this can
        // never deadlock against the main transaction that is still
        // running (deep in this very event callback). It must fail here:
        // that failure is the whole point of the advisory lock. Without
        // it, this transaction would hold nothing and the probe below
        // would succeed instead.
        $acquired = (bool) $race->query(
            'SELECT pg_try_advisory_xact_lock(hashtext('.$race->quote($slug).'))'
        )->fetchColumn();

        $lockHeldByAnotherSession = ! $acquired;
    });

    $response = $this->actingAs($membershipA->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => $slug,
    ]);

    $response->assertOk();
    expect($lockHeldByAnotherSession)->toBeTrue();

    $secondResponse = $this->actingAs($membershipB->user)->patchJson('/api/v1/memberships/me/slug', [
        'slug' => $slug,
    ]);

    $secondResponse->assertStatus(409);
    $secondResponse->assertJsonPath('error.code', ErrorCode::MembershipsSlugTaken->value);

    expect(Membership::withoutGlobalScope('organization')->where('slug', $slug)->count())->toBe(1);
});
