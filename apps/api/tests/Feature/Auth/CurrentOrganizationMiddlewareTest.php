<?php

declare(strict_types=1);

use App\Enums\MembershipStatus;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    // Registered per test, against that test's own Application instance —
    // a top-level registration would only bind to the app created while
    // this file is first loaded, not the fresh app each test boots.
    Route::middleware(['auth:sanctum', 'organization'])->get('/api/v1/_test/org', function () {
        return response()->json(['organization_id' => app(CurrentOrganization::class)->get()]);
    });
});

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('a user with an active membership passes and CurrentOrganization is set from it', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)->getJson('/api/v1/_test/org');

    $response->assertOk();
    expect($response->json('organization_id'))->toBe($membership->organization_id);
});

test('a user with no memberships gets a 403', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/v1/_test/org');

    $response->assertStatus(403);
});

test('a user whose only membership is inactive gets a 403', function () {
    $membership = Membership::factory()->create(['status' => MembershipStatus::Inactive]);

    $response = $this->actingAs($membership->user)->getJson('/api/v1/_test/org');

    $response->assertStatus(403);
});

test('a user whose only membership is soft-deleted gets a 403', function () {
    $membership = Membership::factory()->create();
    $membership->delete();

    $response = $this->actingAs($membership->user)->getJson('/api/v1/_test/org');

    $response->assertStatus(403);
});

test('a user with two active memberships in different organizations resolves the most recent, deterministically across requests', function () {
    $user = User::factory()->create();

    Membership::factory()->create(['user_id' => $user->id, 'created_at' => now()->subDay()]);
    $newer = Membership::factory()->create(['user_id' => $user->id, 'created_at' => now()]);

    $first = $this->actingAs($user)->getJson('/api/v1/_test/org');
    $second = $this->actingAs($user)->getJson('/api/v1/_test/org');

    $first->assertOk();
    $second->assertOk();
    expect($first->json('organization_id'))->toBe($newer->organization_id);
    expect($second->json('organization_id'))->toBe($newer->organization_id);
});

test('the client cannot influence organization resolution via header or query param', function () {
    $user = User::factory()->create();
    $legit = Membership::factory()->create(['user_id' => $user->id]);
    $other = Organization::factory()->create();

    $response = $this->actingAs($user)
        ->withHeader('X-Organization', (string) $other->id)
        ->getJson("/api/v1/_test/org?organization_id={$other->id}");

    $response->assertOk();
    expect($response->json('organization_id'))->toBe($legit->organization_id);
});

test('/me responds 200 and /logout responds 204 for a user without any membership', function () {
    $user = User::factory()->create();

    $meResponse = $this->actingAs($user)->getJson('/api/v1/me');
    $meResponse->assertOk();

    // Sanctum only boots the session for requests it recognizes as coming
    // from the SPA (Origin/Referer matching SANCTUM_STATEFUL_DOMAINS) —
    // see tests/Feature/SanctumSpaAuthTest.php.
    $logoutResponse = $this->actingAs($user)
        ->withHeader('Referer', 'http://localhost:5174')
        ->postJson('/api/v1/logout');
    $logoutResponse->assertNoContent();
});
