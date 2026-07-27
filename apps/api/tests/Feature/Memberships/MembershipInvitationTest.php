<?php

declare(strict_types=1);

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use App\Mail\Memberships\MembershipInvitationMail;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\Organization;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * Extracts the plaintext acceptance token from the URL carried by the
 * mailable — the only place, besides the request that created it, where
 * the raw value ever exists.
 */
function tokenFromAcceptanceUrl(string $acceptanceUrl): string
{
    /** @var array<int, string> $segments */
    $segments = explode('/', rtrim($acceptanceUrl, '/'));

    return (string) end($segments);
}

test('inviting creates an invitation for the active organization, stores only the token hash, and dispatches the mail', function () {
    Mail::fake();
    $owner = Membership::factory()->owner()->create();

    $response = $this->actingAs($owner->user)->postJson('/api/v1/memberships/invitations', [
        'email' => 'invitee@example.com',
        'roles' => ['staff'],
    ]);

    $response->assertCreated();

    $capturedToken = null;
    Mail::assertSent(MembershipInvitationMail::class, function (MembershipInvitationMail $mailable) use (&$capturedToken): bool {
        $capturedToken = tokenFromAcceptanceUrl($mailable->acceptanceUrl);

        return $mailable->hasTo('invitee@example.com');
    });

    expect($capturedToken)->not->toBeNull();

    $invitation = MembershipInvitation::where('email', 'invitee@example.com')->first();
    expect($invitation)->not->toBeNull();
    expect($invitation->organization_id)->toBe($owner->organization_id);
    expect($invitation->token)->toBe(hash('sha256', (string) $capturedToken));
    expect($invitation->token)->not->toBe($capturedToken);
});

test('inviting the same email again invalidates the previous pending invitation', function () {
    Mail::fake();
    $owner = Membership::factory()->owner()->create();

    $this->actingAs($owner->user)->postJson('/api/v1/memberships/invitations', [
        'email' => 'invitee@example.com',
        'roles' => ['staff'],
    ])->assertCreated();

    $firstToken = null;
    Mail::assertSent(MembershipInvitationMail::class, function (MembershipInvitationMail $mailable) use (&$firstToken): bool {
        $firstToken = tokenFromAcceptanceUrl($mailable->acceptanceUrl);

        return true;
    });

    $this->actingAs($owner->user)->postJson('/api/v1/memberships/invitations', [
        'email' => 'invitee@example.com',
        'roles' => ['professional'],
    ])->assertCreated();

    expect(
        MembershipInvitation::where('token', hash('sha256', (string) $firstToken))->exists()
    )->toBeFalse();

    $this->getJson('/api/v1/invitations/'.$firstToken)->assertStatus(404);
});

test('a user without MembershipsManage permission gets 403 when inviting', function () {
    $staff = Membership::factory()->staff()->create();

    $this->actingAs($staff->user)->postJson('/api/v1/memberships/invitations', [
        'email' => 'invitee@example.com',
        'roles' => ['staff'],
    ])->assertStatus(403);
});

test('a guest gets 401 when inviting', function () {
    $this->postJson('/api/v1/memberships/invitations', [
        'email' => 'invitee@example.com',
        'roles' => ['staff'],
    ])->assertStatus(401);
});

test('inviting never accepts organization_id from the payload', function () {
    Mail::fake();
    $owner = Membership::factory()->owner()->create();
    $otherOrganization = Organization::factory()->create();

    $this->actingAs($owner->user)->postJson('/api/v1/memberships/invitations', [
        'organization_id' => $otherOrganization->id,
        'email' => 'invitee@example.com',
        'roles' => ['staff'],
    ])->assertCreated();

    $invitation = MembershipInvitation::where('email', 'invitee@example.com')->first();
    expect($invitation)->not->toBeNull();
    expect($invitation->organization_id)->toBe($owner->organization_id);
    expect($invitation->organization_id)->not->toBe($otherOrganization->id);
});

test('showing a valid token whose email is unknown reports registration is required, exposing only the expected keys', function () {
    $rawToken = Str::random(40);
    $invitation = MembershipInvitation::factory()->create([
        'email' => 'unknown@example.com',
        'token' => hash('sha256', $rawToken),
    ]);

    $response = $this->getJson('/api/v1/invitations/'.$rawToken);

    $response->assertOk();
    expect(array_keys($response->json()))->toEqualCanonicalizing(['email', 'organization_name', 'requires_registration']);
    expect($response->json('email'))->toBe('unknown@example.com');
    expect($response->json('organization_name'))->toBe($invitation->organization?->name);
    expect($response->json('requires_registration'))->toBeTrue();
});

test('showing a valid token whose email already belongs to a user reports registration is not required', function () {
    $user = User::factory()->create(['email' => 'existing@example.com']);
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->create([
        'email' => $user->email,
        'token' => hash('sha256', $rawToken),
    ]);

    $response = $this->getJson('/api/v1/invitations/'.$rawToken);

    $response->assertOk();
    expect(array_keys($response->json()))->toEqualCanonicalizing(['email', 'organization_name', 'requires_registration']);
    expect($response->json('requires_registration'))->toBeFalse();
});

test('showing an invalid token returns a Spanish error that does not reveal whether the email is registered', function () {
    $response = $this->getJson('/api/v1/invitations/'.Str::random(40));

    $response->assertStatus(404);
    expect($response->json('message'))->toBe('La invitación no es válida o ya expiró.');
});

test('showing an expired token returns a Spanish error', function () {
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->expired()->create([
        'token' => hash('sha256', $rawToken),
    ]);

    $response = $this->getJson('/api/v1/invitations/'.$rawToken);

    $response->assertStatus(404);
    expect($response->json('message'))->toBe('La invitación no es válida o ya expiró.');
});

test('showing an already-accepted token returns a Spanish error', function () {
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->accepted()->create([
        'token' => hash('sha256', $rawToken),
    ]);

    $response = $this->getJson('/api/v1/invitations/'.$rawToken);

    $response->assertStatus(404);
    expect($response->json('message'))->toBe('La invitación no es válida o ya expiró.');
});

test('accepting with an unknown email creates the user and an active membership with the invited roles, in the inviting organization only', function () {
    $organization = Organization::factory()->create();
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->create([
        'organization_id' => $organization->id,
        'email' => 'newperson@example.com',
        'roles' => [MembershipRole::Professional],
        'token' => hash('sha256', $rawToken),
    ]);

    $response = $this->withHeader('Referer', 'http://localhost:5174')->postJson('/api/v1/invitations/'.$rawToken, [
        'name' => 'New Person',
        'password' => 'a-strong-password',
        'password_confirmation' => 'a-strong-password',
    ]);

    $response->assertOk();

    $user = User::where('email', 'newperson@example.com')->first();
    expect($user)->not->toBeNull();
    expect($user->name)->toBe('New Person');

    $memberships = Membership::where('user_id', $user->id)->get();
    expect($memberships)->toHaveCount(1);
    expect($memberships->first()->organization_id)->toBe($organization->id);
    expect($memberships->first()->status)->toBe(MembershipStatus::Active);
    expect(array_map(fn (MembershipRole $role): string => $role->value, $memberships->first()->roles))
        ->toBe(['professional']);
});

test('accepting with an email that already has a user creates only the membership, no duplicate user', function () {
    $user = User::factory()->create(['email' => 'existing@example.com']);
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->create([
        'email' => $user->email,
        'roles' => [MembershipRole::Staff],
        'token' => hash('sha256', $rawToken),
    ]);

    $response = $this->withHeader('Referer', 'http://localhost:5174')->postJson('/api/v1/invitations/'.$rawToken, []);

    $response->assertOk();
    expect(User::where('email', 'existing@example.com')->count())->toBe(1);
    expect(Membership::where('user_id', $user->id)->count())->toBe(1);
});

test('accepting without name/password when registration is required returns 422', function () {
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->create([
        'email' => 'newperson@example.com',
        'token' => hash('sha256', $rawToken),
    ]);

    $response = $this->postJson('/api/v1/invitations/'.$rawToken, []);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors(['name', 'password']);
});

test('a token is single use: accepting twice fails on the second attempt and accepted_at is set once', function () {
    $rawToken = Str::random(40);
    $invitation = MembershipInvitation::factory()->create([
        'email' => 'newperson@example.com',
        'token' => hash('sha256', $rawToken),
    ]);

    $this->withHeader('Referer', 'http://localhost:5174')->postJson('/api/v1/invitations/'.$rawToken, [
        'name' => 'New Person',
        'password' => 'a-strong-password',
        'password_confirmation' => 'a-strong-password',
    ])->assertOk();

    $acceptedAt = $invitation->fresh()->accepted_at;
    expect($acceptedAt)->not->toBeNull();

    $secondResponse = $this->postJson('/api/v1/invitations/'.$rawToken, [
        'name' => 'New Person',
        'password' => 'a-strong-password',
        'password_confirmation' => 'a-strong-password',
    ]);

    $secondResponse->assertStatus(422);
    expect($invitation->fresh()->accepted_at)->toEqual($acceptedAt);
});

test('accepting with an expired token returns a Spanish error', function () {
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->expired()->create([
        'email' => 'newperson@example.com',
        'token' => hash('sha256', $rawToken),
    ]);

    $response = $this->postJson('/api/v1/invitations/'.$rawToken, []);

    $response->assertStatus(422);
    expect($response->json('errors.token.0'))->toBe('La invitación no es válida o ya expiró.');
});
