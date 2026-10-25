<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Enums\SubscriptionStatus;
use App\Models\Appointment;
use App\Models\Availability;
use App\Models\AvailabilityException;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\ProfessionalService;
use App\Models\Subscription;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * An owner membership plus one of each gated resource it can write,
 * optionally under a subscription in `$status` (null = no subscription row
 * at all).
 *
 * @param  array<string, mixed>  $subscriptionAttributes
 * @return array{membership: Membership, appointment: Appointment, availability: Availability, exception: AvailabilityException, note: ClinicalNote, prescription: Prescription}
 */
function restrictionFixture(?SubscriptionStatus $status, array $subscriptionAttributes = []): array
{
    $organization = Organization::factory()->create(['slug' => 'consultorio-restringido-'.fake()->unique()->numberBetween(1, 999999)]);
    $membership = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
    ]);
    $scope = ['organization_id' => $organization->id, 'membership_id' => $membership->id];

    if ($status !== null) {
        Subscription::factory()->withStatus($status)->create(['organization_id' => $organization->id, ...$subscriptionAttributes]);
    }

    return [
        'membership' => $membership,
        'appointment' => $appointment,
        'availability' => Availability::factory()->create($scope),
        'exception' => AvailabilityException::factory()->create($scope),
        'note' => ClinicalNote::factory()->create(['appointment_id' => $appointment->id]),
        'prescription' => Prescription::factory()->create(['appointment_id' => $appointment->id]),
    ];
}

/**
 * Every gated write, as [method, uri]. Payloads are empty on purpose: the
 * restriction runs before validation, so a 409 here can only come from it.
 * Deletes go last so the unrestricted run still reaches every route.
 *
 * @param  array{membership: Membership, appointment: Appointment, availability: Availability, exception: AvailabilityException, note: ClinicalNote, prescription: Prescription}  $fixture
 * @return array<string, array{0: string, 1: string}>
 */
function gatedWrites(array $fixture): array
{
    $membership = $fixture['membership'];
    $appointment = $fixture['appointment'];
    $organization = Organization::query()->findOrFail($membership->organization_id);

    return [
        'appointment store' => ['post', '/api/v1/appointments'],
        'appointment status' => ['patch', "/api/v1/appointments/{$appointment->id}/status"],
        'appointment cancel' => ['patch', "/api/v1/appointments/{$appointment->id}/cancel"],
        'appointment reschedule' => ['post', "/api/v1/appointments/{$appointment->id}/reschedule"],
        'clinical note store' => ['post', "/api/v1/appointments/{$appointment->id}/clinical-notes"],
        'clinical note amendment' => ['post', "/api/v1/clinical-notes/{$fixture['note']->id}/amendments"],
        'clinical note annulment' => ['post', "/api/v1/clinical-notes/{$fixture['note']->id}/annulment"],
        'prescription store' => ['post', "/api/v1/appointments/{$appointment->id}/prescriptions"],
        'prescription amendment' => ['post', "/api/v1/prescriptions/{$fixture['prescription']->id}/amendments"],
        'prescription annulment' => ['post', "/api/v1/prescriptions/{$fixture['prescription']->id}/annulment"],
        'availability store' => ['post', "/api/v1/memberships/{$membership->id}/availabilities"],
        'availability update' => ['patch', "/api/v1/availabilities/{$fixture['availability']->id}"],
        'availability exception store' => ['post', '/api/v1/availability-exceptions'],
        'availability exception update' => ['patch', "/api/v1/availability-exceptions/{$fixture['exception']->id}"],
        'public booking store' => ['post', "/api/v1/booking/{$organization->slug}/appointments"],
        'availability destroy' => ['delete', "/api/v1/availabilities/{$fixture['availability']->id}"],
        'availability exception destroy' => ['delete', "/api/v1/availability-exceptions/{$fixture['exception']->id}"],
    ];
}

test('every appointment, clinical note, prescription, availability and public booking write returns 409 when the subscription expired', function (SubscriptionStatus $status, array $attributes) {
    $fixture = restrictionFixture($status, $attributes);
    $membership = $fixture['membership'];

    foreach (gatedWrites($fixture) as $label => [$method, $uri]) {
        $response = $this->actingAs($membership->user)->json($method, $uri, []);

        expect($response->status())->toBe(409, $label);
        expect($response->json('error.code'))->toBe(ErrorCode::SubscriptionsInactive->value, $label);
        expect($response->json('error.context.subscription_status'))->toBe($status->value, $label);
    }
})->with([
    'expired' => [SubscriptionStatus::Expired, []],
]);

test('writes are not restricted without a subscription row, while pending, active or in grace, or once cancelled (#237: on Free after its paid period)', function (?SubscriptionStatus $status, array $attributes) {
    $fixture = restrictionFixture($status, $attributes);
    $membership = $fixture['membership'];

    foreach (gatedWrites($fixture) as $label => [$method, $uri]) {
        $response = $this->actingAs($membership->user)->json($method, $uri, []);

        // A successful destroy answers 204 with no body to decode.
        $errorCode = $response->getContent() === '' ? null : $response->json('error.code');

        expect($errorCode)->not->toBe(ErrorCode::SubscriptionsInactive->value, $label);
    }
})->with([
    'no subscription' => [null, []],
    'pending' => [SubscriptionStatus::Pending, []],
    'active' => [SubscriptionStatus::Active, []],
    'grace' => [SubscriptionStatus::Grace, []],
    'cancelled, paid period left' => fn () => [SubscriptionStatus::Cancelled, ['access_ends_at' => now()->addDay()]],
    'cancelled, paid period over' => fn () => [SubscriptionStatus::Cancelled, ['access_ends_at' => now()->subMinute()]],
    'cancelled with no paid period' => [SubscriptionStatus::Cancelled, []],
]);

test('an active subscription books an appointment end to end', function () {
    ['membership' => $membership] = restrictionFixture(SubscriptionStatus::Active);
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $this->actingAs($membership->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => Patient::factory()->create()->id,
        'service_id' => $professionalService->service_id,
        'start_at' => '2026-08-03T10:00:00Z',
    ])->assertCreated();
});

test('reads stay allowed while the subscription is expired', function () {
    ['membership' => $membership, 'appointment' => $appointment] = restrictionFixture(SubscriptionStatus::Expired);

    $this->actingAs($membership->user)
        ->getJson('/api/v1/appointments?from=2020-01-01T00:00:00Z&to=2030-01-01T00:00:00Z')
        ->assertOk();
    $this->actingAs($membership->user)
        ->getJson("/api/v1/memberships/{$membership->id}/availabilities")
        ->assertOk();
    $this->actingAs($membership->user)
        ->getJson("/api/v1/appointments/{$appointment->id}/clinical-notes")
        ->assertOk();
});

test('another organization\'s expired subscription does not restrict this one', function () {
    restrictionFixture(SubscriptionStatus::Expired);
    ['membership' => $membership] = restrictionFixture(SubscriptionStatus::Active);

    $response = $this->actingAs($membership->user)->postJson('/api/v1/appointments', []);

    expect($response->json('error.code'))->not->toBe(ErrorCode::SubscriptionsInactive->value);
    $response->assertStatus(422);
});
