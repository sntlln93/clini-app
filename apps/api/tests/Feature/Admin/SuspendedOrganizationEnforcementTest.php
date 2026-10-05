<?php

declare(strict_types=1);

use App\Actions\Memberships\AcceptInvitationAction;
use App\Data\Memberships\InvitationAcceptanceData;
use App\Exceptions\Memberships\InvitationInvalidOrExpiredException;
use App\Models\Availability;
use App\Models\Membership;
use App\Models\MembershipInvitation;
use App\Models\Organization;
use App\Models\ProfessionalService;
use App\Models\Service;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

afterEach(function () {
    freshRequestState();
});

/**
 * An organization with an owner and a professional who has a public slug,
 * a service and weekly availability, so its public booking works.
 *
 * @return array{organization: Organization, owner: User, professional: Membership, service: Service}
 */
function suspensionFixture(): array
{
    $organization = Organization::factory()->create(['timezone' => 'UTC', 'slug' => 'consultorio-a-suspender']);
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $professional = Membership::factory()->professional()->create([
        'organization_id' => $organization->id,
        'slug' => 'dra-suspendida',
    ]);
    $service = Service::factory()->create();
    ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
        'service_id' => $service->id,
        'duration_minutes' => 30,
        'active' => true,
    ]);
    Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '17:00:00',
    ]);

    /** @var User $user */
    $user = $owner->user;

    return ['organization' => $organization, 'owner' => $user, 'professional' => $professional, 'service' => $service];
}

function suspendOrganization(Organization $organization): void
{
    $organization->forceFill(['suspended_at' => now(), 'suspension_reason' => 'Deuda'])->save();
}

test('a member of a suspended organization gets 403 organizations.suspended on org-scoped routes', function (string $uri) {
    $fixture = suspensionFixture();
    suspendOrganization($fixture['organization']);

    $this->actingAs($fixture['owner'])->getJson($uri)
        ->assertForbidden()
        ->assertJsonPath('error.code', 'organizations.suspended')
        ->assertJsonPath('error.context', []);
})->with([
    'patients' => ['/api/v1/patients'],
    'subscription' => ['/api/v1/subscription'],
]);

test('/me stays reachable for a member of a suspended organization and exposes suspended_at', function () {
    $fixture = suspensionFixture();
    suspendOrganization($fixture['organization']);

    $response = $this->actingAs($fixture['owner'])->getJson('/api/v1/me');

    $response->assertOk();
    expect($response->json('organization.id'))->toBe($fixture['organization']->id);
    expect($response->json('organization.suspended_at'))->not->toBeNull();
});

test('members of other organizations are unaffected', function () {
    $fixture = suspensionFixture();
    suspendOrganization($fixture['organization']);
    $otherOwner = Membership::factory()->owner()->create();

    $this->actingAs($otherOwner->user)->getJson('/api/v1/patients')->assertOk();
});

test('public booking of a suspended organization is 403 booking.organization_unavailable, by organization or professional slug', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-04 12:00:00', 'UTC'));
    $fixture = suspensionFixture();
    suspendOrganization($fixture['organization']);
    $membershipId = $fixture['professional']->id;
    $serviceId = $fixture['service']->id;

    $requests = [
        ['get', '/api/v1/booking/consultorio-a-suspender'],
        ['get', "/api/v1/booking/consultorio-a-suspender/slots?membership_id={$membershipId}&service_id={$serviceId}&from=2026-10-05"],
        ['post', '/api/v1/booking/consultorio-a-suspender/appointments'],
        ['get', '/api/v1/booking/dra-suspendida'],
        ['get', "/api/v1/booking/dra-suspendida/slots?membership_id={$membershipId}&service_id={$serviceId}&from=2026-10-05"],
        ['post', '/api/v1/booking/dra-suspendida/appointments'],
    ];

    foreach ($requests as [$method, $uri]) {
        $this->json($method, $uri)
            ->assertForbidden()
            ->assertJsonPath('error.code', 'booking.organization_unavailable');
        freshRequestState();
    }

    $this->getJson('/api/v1/booking/no-existe')->assertNotFound();
});

test('after reactivation the panel and public booking work again', function () {
    $this->travelTo(CarbonImmutable::parse('2026-10-04 12:00:00', 'UTC'));
    $fixture = suspensionFixture();
    suspendOrganization($fixture['organization']);

    actingAsAdmin()->deleteJson("/api/v1/admin/organizations/{$fixture['organization']->id}/suspension")->assertOk();
    freshRequestState();

    fromPanel()->actingAs($fixture['owner'])->getJson('/api/v1/patients')->assertOk();
    freshRequestState();
    $this->getJson('/api/v1/booking/consultorio-a-suspender')->assertOk();
    freshRequestState();
    $this->getJson('/api/v1/booking/dra-suspendida')->assertOk();
});

test('a pending invitation of a suspended organization is invalid, on show and on accept', function () {
    $fixture = suspensionFixture();
    $member = Membership::factory()->owner()->create();
    /** @var User $invitee */
    $invitee = $member->user;
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->create([
        'organization_id' => $fixture['organization']->id,
        'email' => $invitee->email,
        'token' => hash('sha256', $rawToken),
    ]);
    suspendOrganization($fixture['organization']);

    $this->getJson('/api/v1/invitations/'.$rawToken)
        ->assertNotFound()
        ->assertJsonPath('error.code', 'memberships.invitation_invalid_or_expired');
    freshRequestState();

    fromPanel()->postJson('/api/v1/invitations/'.$rawToken, [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['token']);

    expect(Membership::query()->where('user_id', $invitee->id)->count())->toBe(1);
    $this->assertGuest('web');
});

test('accepting re-checks the suspension under lock, after the request validated the token', function () {
    $fixture = suspensionFixture();
    $rawToken = Str::random(40);
    MembershipInvitation::factory()->create([
        'organization_id' => $fixture['organization']->id,
        'email' => 'nueva@example.com',
        'token' => hash('sha256', $rawToken),
    ]);
    suspendOrganization($fixture['organization']);

    expect(fn () => app(AcceptInvitationAction::class)->handle(
        new InvitationAcceptanceData(token: $rawToken, name: 'Nueva', password: 'a-strong-password'),
    ))->toThrow(InvitationInvalidOrExpiredException::class);

    expect(User::query()->where('email', 'nueva@example.com')->exists())->toBeFalse();
});
