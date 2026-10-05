<?php

declare(strict_types=1);

use App\Models\AdminAuditLog;
use App\Models\Membership;
use App\Models\PlatformAdmin;
use App\Models\User;
use Illuminate\Support\Facades\DB;

afterEach(function () {
    freshRequestState();
});

test('a clinic user is unauthenticated on every operator route', function (string $method, string $template) {
    $user = User::factory()->create();
    $uri = adminRouteUri($template);

    fromDashboard()->actingAs($user)->json($method, $uri)->assertUnauthorized();
})->with('admin_routes');

test('a guest is unauthenticated on every operator route', function (string $method, string $template) {
    $uri = adminRouteUri($template);

    fromDashboard()->json($method, $uri)->assertUnauthorized();
})->with('admin_routes');

test('an operator is unauthenticated on the clinic API', function (string $method, string $uri) {
    actingAsAdmin();

    fromPanel()->json($method, $uri)->assertUnauthorized();
})->with([
    'me' => ['get', '/api/v1/me'],
    'patients' => ['get', '/api/v1/patients'],
    'subscription' => ['get', '/api/v1/subscription'],
    'logout' => ['post', '/api/v1/logout'],
]);

/**
 * Logs a clinic user and an operator into the same (shared) session, the
 * way one browser running both SPAs would.
 *
 * @return array{0: User, 1: PlatformAdmin}
 */
function logBothIntoOneSession(): array
{
    $membership = Membership::factory()->owner()->create();
    /** @var User $user */
    $user = $membership->user;
    $admin = PlatformAdmin::factory()->create();

    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
    freshRequestState();
    fromDashboard()->postJson('/api/v1/admin/login', ['email' => $admin->email, 'password' => 'password'])->assertOk();
    freshRequestState();

    return [$user, $admin];
}

test('a clinic login and an operator login coexist in one session', function () {
    [$user, $admin] = logBothIntoOneSession();

    fromPanel()->getJson('/api/v1/me')->assertOk()->assertJsonPath('email', $user->email);
    freshRequestState();
    fromDashboard()->getJson('/api/v1/admin/me')->assertOk()->assertJsonPath('data.id', $admin->id);
});

test('operator logout keeps the clinic session alive', function () {
    [$user] = logBothIntoOneSession();

    fromDashboard()->postJson('/api/v1/admin/logout')->assertNoContent();
    freshRequestState();

    fromPanel()->getJson('/api/v1/me')->assertOk()->assertJsonPath('email', $user->email);
    freshRequestState();
    fromDashboard()->getJson('/api/v1/admin/me')->assertUnauthorized();
});

test('clinic logout keeps the operator session alive', function () {
    [, $admin] = logBothIntoOneSession();
    app('session.store')->put('probe', 'kept');

    fromPanel()->postJson('/api/v1/logout')->assertNoContent();
    freshRequestState();

    expect(app('session.store')->get('probe'))->toBe('kept');
    expect(app('session.store')->has('password_hash_web'))->toBeFalse();
    fromDashboard()->getJson('/api/v1/admin/me')->assertOk()->assertJsonPath('data.id', $admin->id);
    freshRequestState();
    fromPanel()->getJson('/api/v1/me')->assertUnauthorized();
});

test('clinic logout with no operator in the session still invalidates the whole session', function () {
    $user = User::factory()->create();

    fromPanel()->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
    freshRequestState();
    app('session.store')->put('probe', 'dropped');

    fromPanel()->postJson('/api/v1/logout')->assertNoContent();
    freshRequestState();

    expect(app('session.store')->has('probe'))->toBeFalse();
    fromPanel()->getJson('/api/v1/me')->assertUnauthorized();
});

test('a clinic user logging in after another one logged out does not flush the shared session', function () {
    $admin = PlatformAdmin::factory()->create();
    $userA = User::factory()->create(['password' => 'password-of-a']);
    $userB = User::factory()->create(['password' => 'password-of-b']);

    fromDashboard()->postJson('/api/v1/admin/login', ['email' => $admin->email, 'password' => 'password'])->assertOk();
    freshRequestState();
    fromPanel()->postJson('/api/v1/login', ['email' => $userA->email, 'password' => 'password-of-a'])->assertOk();
    freshRequestState();
    fromPanel()->getJson('/api/v1/me')->assertOk();
    freshRequestState();
    fromPanel()->postJson('/api/v1/logout')->assertNoContent();
    freshRequestState();

    expect(app('session.store')->has('password_hash_web'))->toBeFalse();

    fromPanel()->postJson('/api/v1/login', ['email' => $userB->email, 'password' => 'password-of-b'])->assertOk();
    freshRequestState();
    fromPanel()->getJson('/api/v1/me')->assertOk()->assertJsonPath('email', $userB->email);
    freshRequestState();
    fromDashboard()->getJson('/api/v1/admin/me')->assertOk()->assertJsonPath('data.id', $admin->id);
});

test('a clinic user logged out for being blocked does not flush the shared session for the next one', function () {
    $admin = PlatformAdmin::factory()->create();
    $userA = User::factory()->create(['password' => 'password-of-a']);
    $userB = User::factory()->create(['password' => 'password-of-b']);

    fromDashboard()->postJson('/api/v1/admin/login', ['email' => $admin->email, 'password' => 'password'])->assertOk();
    freshRequestState();
    fromPanel()->postJson('/api/v1/login', ['email' => $userA->email, 'password' => 'password-of-a'])->assertOk();
    freshRequestState();
    fromPanel()->getJson('/api/v1/me')->assertOk();
    freshRequestState();

    $userA->forceFill(['blocked_at' => now(), 'block_reason' => 'Abuso'])->save();

    fromPanel()->getJson('/api/v1/me')->assertForbidden()->assertJsonPath('error.code', 'auth.user_blocked');
    freshRequestState();

    expect(app('session.store')->has('password_hash_web'))->toBeFalse();

    fromPanel()->postJson('/api/v1/login', ['email' => $userB->email, 'password' => 'password-of-b'])->assertOk();
    freshRequestState();
    fromPanel()->getJson('/api/v1/me')->assertOk()->assertJsonPath('email', $userB->email);
    freshRequestState();
    fromDashboard()->getJson('/api/v1/admin/me')->assertOk()->assertJsonPath('data.id', $admin->id);
});

// app.debug is forced off where the exact body is asserted: that is the production rendering (debug adds the exception and trace).
test('every operator route rejects the panel origin with a plain 403, even with a valid operator session', function (string $method, string $template) {
    config(['app.debug' => false]);
    $uri = adminRouteUri($template);

    actingAsAdmin()
        ->withHeader('Referer', 'http://localhost:5174/agenda')
        ->json($method, $uri)
        ->assertForbidden()
        ->assertExactJson(['message' => 'Forbidden.']);
})->with('admin_routes');

test('the Origin header wins over a dashboard Referer', function () {
    config(['app.debug' => false]);

    actingAsAdmin()
        ->withHeader('Origin', 'http://localhost:5174')
        ->getJson('/api/v1/admin/me')
        ->assertForbidden()
        ->assertExactJson(['message' => 'Forbidden.']);
});

test('the dashboard Origin is accepted on its own', function () {
    $this->actingAs(PlatformAdmin::factory()->create(), 'admin')
        ->withHeader('Origin', 'http://localhost:5175')
        ->getJson('/api/v1/admin/me')
        ->assertOk();
});

test('operator login from the panel origin is rejected before authenticating', function () {
    config(['app.debug' => false]);
    $admin = PlatformAdmin::factory()->create();

    $this->withHeader('Referer', 'http://localhost:5174/')
        ->postJson('/api/v1/admin/login', ['email' => $admin->email, 'password' => 'password'])
        ->assertForbidden()
        ->assertExactJson(['message' => 'Forbidden.']);

    $this->assertGuest('admin');
    expect(AdminAuditLog::query()->count())->toBe(0);
});

test('operator login with neither Origin nor Referer is rejected', function () {
    $admin = PlatformAdmin::factory()->create();

    $this->postJson('/api/v1/admin/login', ['email' => $admin->email, 'password' => 'password'])
        ->assertForbidden();

    $this->assertGuest('admin');
});

test('every clinic entry point rejects the dashboard origin with a plain 403, even with a valid clinic session', function (string $method, string $uri, string $header, string $value) {
    config(['app.debug' => false]);
    $membership = Membership::factory()->owner()->create();
    /** @var User $user */
    $user = $membership->user;

    $this->actingAs($user)
        ->withHeader($header, $value)
        ->json($method, $uri, ['email' => $user->email, 'password' => 'password'])
        ->assertForbidden()
        ->assertExactJson(['message' => 'Forbidden.']);
})->with([
    'patients' => ['get', '/api/v1/patients'],
    'appointments' => ['post', '/api/v1/appointments'],
    'subscription' => ['get', '/api/v1/subscription'],
    'me' => ['get', '/api/v1/me'],
    'logout' => ['post', '/api/v1/logout'],
    'login' => ['post', '/api/v1/login'],
    'register' => ['post', '/api/v1/register'],
    'email verification' => ['post', '/api/v1/email-verification/some-token'],
    'invitation' => ['post', '/api/v1/invitations/some-token'],
])->with([
    'Referer' => ['Referer', 'http://localhost:5175/organizaciones'],
    'Origin' => ['Origin', 'http://localhost:5175'],
]);

test('a dashboard Origin is rejected on a clinic route even with a panel Referer', function () {
    $membership = Membership::factory()->owner()->create();

    $this->actingAs($membership->user)
        ->withHeaders(['Referer' => 'http://localhost:5174/agenda', 'Origin' => 'http://localhost:5175'])
        ->getJson('/api/v1/patients')
        ->assertForbidden();
});

test('the dashboard can still fetch the CSRF cookie', function () {
    fromDashboard()->get('/sanctum/csrf-cookie')->assertNoContent();
});

test('operator login with a dashboard Origin but a non-stateful Referer is rejected before authenticating', function () {
    config(['app.debug' => false]);
    $admin = PlatformAdmin::factory()->create();

    $this->withHeaders(['Origin' => 'http://localhost:5175', 'Referer' => 'http://elsewhere.test/'])
        ->postJson('/api/v1/admin/login', ['email' => $admin->email, 'password' => 'password'])
        ->assertForbidden()
        ->assertExactJson(['message' => 'Forbidden.']);

    expect($admin->fresh()?->last_login_at)->toBeNull();
    expect(AdminAuditLog::query()->count())->toBe(0);
});

/**
 * Switches to the database session driver for the rest of the test, so a
 * logout's effect on the stored session records is observable.
 */
function useDatabaseSessions(): void
{
    config(['session.driver' => 'database']);
}

function currentSessionId(): string
{
    return app('session')->driver()->getId();
}

test('operator logout destroys the pre-logout session record', function () {
    useDatabaseSessions();
    $admin = PlatformAdmin::factory()->create();

    fromDashboard()->postJson('/api/v1/admin/login', ['email' => $admin->email, 'password' => 'password'])->assertOk();
    freshRequestState();
    $oldId = currentSessionId();
    expect(DB::table('sessions')->where('id', $oldId)->exists())->toBeTrue();

    fromDashboard()->withCredentials()->withCookie((string) config('session.cookie'), $oldId)
        ->postJson('/api/v1/admin/logout')
        ->assertNoContent();

    expect(currentSessionId())->not->toBe($oldId);
    expect(DB::table('sessions')->where('id', $oldId)->exists())->toBeFalse();
});

test('clinic logout that keeps an operator session destroys the pre-logout session record', function () {
    useDatabaseSessions();
    [$user, $admin] = logBothIntoOneSession();
    $oldId = currentSessionId();
    expect(DB::table('sessions')->where('id', $oldId)->exists())->toBeTrue();

    fromPanel()->withCredentials()->withCookie((string) config('session.cookie'), $oldId)
        ->postJson('/api/v1/logout')
        ->assertNoContent();
    freshRequestState();

    expect(DB::table('sessions')->where('id', $oldId)->exists())->toBeFalse();
    fromDashboard()->getJson('/api/v1/admin/me')->assertOk()->assertJsonPath('data.id', $admin->id);
});
