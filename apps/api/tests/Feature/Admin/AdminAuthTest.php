<?php

declare(strict_types=1);

use App\Enums\AdminAuditAction;
use App\Models\AdminAuditLog;
use App\Models\PlatformAdmin;
use App\Models\User;

afterEach(function () {
    freshRequestState();
});

test('an operator logs in with valid credentials, stamping last_login_at and an auth.login audit row', function () {
    $admin = PlatformAdmin::factory()->create(['email' => 'olivia@clini.test']);

    $response = fromDashboard()->postJson('/api/v1/admin/login', [
        'email' => 'olivia@clini.test',
        'password' => 'password',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['data' => ['id', 'name', 'email', 'last_login_at']])
        ->assertJsonPath('data.id', $admin->id)
        ->assertJsonPath('data.email', 'olivia@clini.test');
    expect(array_keys($response->json('data')))->toBe(['id', 'name', 'email', 'last_login_at']);
    expect($response->json('data.last_login_at'))->not->toBeNull();
    expect($admin->fresh()?->last_login_at)->not->toBeNull();
    $this->assertAuthenticatedAs($admin, 'admin');

    $log = AdminAuditLog::query()->sole();
    expect($log->action)->toBe(AdminAuditAction::AuthLogin);
    expect($log->platform_admin_id)->toBe($admin->id);
    expect($log->subject_type)->toBeNull();
    expect($log->subject_id)->toBeNull();
    expect($log->ip)->toBe('127.0.0.1');
});

test('a wrong password returns 422 Invalid credentials, stays a guest and writes no audit row', function () {
    $admin = PlatformAdmin::factory()->create();

    $response = fromDashboard()->postJson('/api/v1/admin/login', [
        'email' => $admin->email,
        'password' => 'wrong-password',
    ]);

    $response->assertStatus(422);
    expect($response->json())->toBe(['message' => 'Invalid credentials.']);
    $this->assertGuest('admin');
    expect(AdminAuditLog::query()->count())->toBe(0);
});

test('a clinic user\'s own credentials are not accepted by the operator login', function () {
    $user = User::factory()->create();

    fromDashboard()->postJson('/api/v1/admin/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertStatus(422)->assertExactJson(['message' => 'Invalid credentials.']);

    $this->assertGuest('admin');
    $this->assertGuest('web');
});

test('missing email or password is a standard validation error', function () {
    fromDashboard()->postJson('/api/v1/admin/login', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email', 'password']);
});

test('the sixth login attempt within a minute for the same email and ip is throttled', function () {
    $admin = PlatformAdmin::factory()->create();

    foreach (range(1, 5) as $attempt) {
        fromDashboard()->postJson('/api/v1/admin/login', [
            'email' => $admin->email,
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    fromDashboard()->postJson('/api/v1/admin/login', [
        'email' => $admin->email,
        'password' => 'password',
    ])->assertStatus(429);

    $this->assertGuest('admin');
});

test('padding or re-casing the email does not open a fresh throttle bucket for the same operator', function () {
    $admin = PlatformAdmin::factory()->create();

    foreach ([' '.$admin->email, $admin->email.' ', '  '.$admin->email, strtoupper($admin->email), "\t".$admin->email] as $variant) {
        fromDashboard()->postJson('/api/v1/admin/login', [
            'email' => $variant,
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    fromDashboard()->postJson('/api/v1/admin/login', [
        'email' => $admin->email,
        'password' => 'password',
    ])->assertStatus(429);
});

test('a non-string email is a validation error, not a server error', function () {
    fromDashboard()->postJson('/api/v1/admin/login', ['email' => ['x'], 'password' => 'p'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

test('GET /admin/me is 401 for a guest and returns the operator when authenticated', function () {
    fromDashboard()->getJson('/api/v1/admin/me')->assertUnauthorized();

    $admin = PlatformAdmin::factory()->create();

    actingAsAdmin($admin)->getJson('/api/v1/admin/me')
        ->assertOk()
        ->assertJsonPath('data.id', $admin->id)
        ->assertJsonPath('data.name', $admin->name)
        ->assertJsonPath('data.email', $admin->email)
        ->assertJsonPath('data.last_login_at', null);
});

test('logout returns 204, records auth.logout for that operator, and ends the operator session', function () {
    $admin = PlatformAdmin::factory()->create();

    fromDashboard()->postJson('/api/v1/admin/login', ['email' => $admin->email, 'password' => 'password'])->assertOk();
    freshRequestState();

    $this->postJson('/api/v1/admin/logout')->assertNoContent();

    $logout = AdminAuditLog::query()->where('action', AdminAuditAction::AuthLogout)->sole();
    expect($logout->platform_admin_id)->toBe($admin->id);
    expect($logout->subject_type)->toBeNull();

    freshRequestState();
    $this->getJson('/api/v1/admin/me')->assertUnauthorized();
});
