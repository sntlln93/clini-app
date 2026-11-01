<?php

declare(strict_types=1);

use App\Enums\SubscriptionStatus;
use App\Models\Availability;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Subscription;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * @return list<array{day_of_week: int, start_time: string, end_time: string}>
 */
function storedWeek(Membership $membership): array
{
    return DB::table('availabilities')
        ->where('membership_id', $membership->id)
        ->orderBy('day_of_week')
        ->orderBy('start_time')
        ->get(['day_of_week', 'start_time', 'end_time'])
        ->map(fn (object $row): array => [
            'day_of_week' => $row->day_of_week,
            'start_time' => substr($row->start_time, 0, 5),
            'end_time' => substr($row->end_time, 0, 5),
        ])
        ->all();
}

function existingSlot(Membership $membership, int $dayOfWeek = 1, string $start = '09:00:00', string $end = '12:00:00'): Availability
{
    return Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'day_of_week' => $dayOfWeek,
        'start_time' => $start,
        'end_time' => $end,
    ]);
}

test('replace swaps the whole week for the given one and answers it ordered by day then start', function () {
    $membership = Membership::factory()->create();
    existingSlot($membership, 1, '09:00:00', '12:00:00');
    existingSlot($membership, 3, '14:00:00', '18:00:00');

    $response = $this->actingAs($membership->user)->putJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'slots' => [
            ['day_of_week' => 2, 'start_time' => '14:00', 'end_time' => '18:00'],
            ['day_of_week' => 1, 'start_time' => '15:00', 'end_time' => '19:00'],
            ['day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '12:30'],
        ],
    ]);

    $response->assertOk();
    $response->assertJsonCount(3, 'data');
    $response->assertJsonStructure(['data' => [['id', 'membership_id', 'day_of_week', 'start_time', 'end_time']]]);
    $response->assertJsonPath('data.0', [
        'id' => $response->json('data.0.id'),
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '08:00',
        'end_time' => '12:30',
    ]);
    expect(array_column($response->json('data'), 'start_time'))->toBe(['08:00', '15:00', '14:00']);
    expect(storedWeek($membership))->toBe([
        ['day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '12:30'],
        ['day_of_week' => 1, 'start_time' => '15:00', 'end_time' => '19:00'],
        ['day_of_week' => 2, 'start_time' => '14:00', 'end_time' => '18:00'],
    ]);
    expect(DB::table('availabilities')->where('membership_id', $membership->id)->value('organization_id'))
        ->toBe($membership->organization_id);
});

test('replace with an empty list clears the week', function () {
    $membership = Membership::factory()->create();
    existingSlot($membership);
    existingSlot($membership, 4);

    $this->actingAs($membership->user)
        ->putJson("/api/v1/memberships/{$membership->id}/availabilities", ['slots' => []])
        ->assertOk()
        ->assertExactJson(['data' => []]);

    expect(storedWeek($membership))->toBe([]);
});

test('replace leaves the other memberships weeks untouched', function () {
    $membership = Membership::factory()->create();
    $colleague = Membership::factory()->create(['organization_id' => $membership->organization_id]);
    existingSlot($colleague, 2);

    $this->actingAs($membership->user)
        ->putJson("/api/v1/memberships/{$membership->id}/availabilities", ['slots' => []])
        ->assertOk();

    expect(storedWeek($colleague))->toHaveCount(1);
});

test('replace without a slots key returns 422', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)
        ->putJson("/api/v1/memberships/{$membership->id}/availabilities", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors('slots');
});

test('replace with two overlapping franjas of the same day returns 422 on the later one and changes nothing', function () {
    $membership = Membership::factory()->create();
    existingSlot($membership, 5);

    $response = $this->actingAs($membership->user)->putJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'slots' => [
            ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00'],
            ['day_of_week' => 2, 'start_time' => '11:00', 'end_time' => '13:00'],
            ['day_of_week' => 1, 'start_time' => '11:00', 'end_time' => '13:00'],
        ],
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors([
        'slots.2' => 'Esta franja se superpone o queda pegada a la de 09:00 a 12:00 del mismo día.',
    ]);
    $response->assertJsonMissingValidationErrors(['slots.0', 'slots.1']);
    expect(storedWeek($membership))->toBe([['day_of_week' => 5, 'start_time' => '09:00', 'end_time' => '12:00']]);
});

test('replace with a franja nested inside another of the same day returns 422', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->putJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'slots' => [
            ['day_of_week' => 1, 'start_time' => '10:00', 'end_time' => '11:00'],
            ['day_of_week' => 1, 'start_time' => '08:00', 'end_time' => '18:00'],
        ],
    ])->assertStatus(422)->assertJsonValidationErrors('slots.1');
});

test('replace with two franjas of the same day touching at the boundary returns 422', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->putJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'slots' => [
            ['day_of_week' => 1, 'start_time' => '12:00', 'end_time' => '14:00'],
            ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00'],
        ],
    ])->assertStatus(422)->assertJsonValidationErrors([
        'slots.1' => 'Esta franja se superpone o queda pegada a la de 12:00 a 14:00 del mismo día.',
    ]);
});

test('replace accepts franjas of the same day separated by a gap', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->putJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'slots' => [
            ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00'],
            ['day_of_week' => 1, 'start_time' => '12:15', 'end_time' => '14:00'],
        ],
    ])->assertOk()->assertJsonCount(2, 'data');
});

test('replace with end_time not after start_time returns 422 on that item', function (string $end) {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->putJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'slots' => [
            ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => $end],
        ],
    ])->assertStatus(422)->assertJsonValidationErrors([
        'slots.0.end_time' => 'La hora de fin tiene que ser posterior a la de inicio.',
    ]);
})->with(['before' => '08:00', 'equal' => '09:00']);

test('replace with a day_of_week outside 0..6 returns 422 on that item', function (mixed $day) {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->putJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'slots' => [
            ['day_of_week' => $day, 'start_time' => '09:00', 'end_time' => '12:00'],
        ],
    ])->assertStatus(422)->assertJsonValidationErrors('slots.0.day_of_week');
})->with(['seven' => 7, 'negative' => -1, 'text' => 'lunes', 'missing' => null]);

test('replace with a time not in H:i returns 422 on that item', function (string $field, mixed $value) {
    $membership = Membership::factory()->create();
    $slot = ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00', $field => $value];

    $this->actingAs($membership->user)->putJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'slots' => [$slot],
    ])->assertStatus(422)->assertJsonValidationErrors("slots.0.{$field}");
})->with([
    'start with seconds' => ['start_time', '09:00:00'],
    'start out of range' => ['start_time', '25:00'],
    'end text' => ['end_time', 'mediodía'],
    'end missing' => ['end_time', null],
]);

test('replace with slots that are not a list returns 422', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->putJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'slots' => ['monday' => ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00']],
    ])->assertStatus(422)->assertJsonValidationErrors('slots');
});

test('authorization matrix on replace: owner and staff on anyone, a professional only on their own week', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $staff = Membership::factory()->staff()->create(['organization_id' => $organization->id]);
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    // A second professional would exceed the Free plan's limit and make writes read-only.
    $another = Membership::factory()->create(['organization_id' => $organization->id]);
    existingSlot($another, 2);
    $week = ['slots' => [['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00']]];

    $this->actingAs($professional->user)->putJson("/api/v1/memberships/{$professional->id}/availabilities", $week)->assertOk();

    $this->actingAs($professional->user)->putJson("/api/v1/memberships/{$another->id}/availabilities", $week)->assertForbidden();
    expect(storedWeek($another))->toBe([['day_of_week' => 2, 'start_time' => '09:00', 'end_time' => '12:00']]);

    $this->actingAs($owner->user)->putJson("/api/v1/memberships/{$another->id}/availabilities", $week)->assertOk();
    $this->actingAs($staff->user)->putJson("/api/v1/memberships/{$professional->id}/availabilities", ['slots' => []])->assertOk();

    expect(storedWeek($another))->toBe([['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00']]);
    expect(storedWeek($professional))->toBe([]);
});

test('replace on a membership of another organization returns 403 and changes nothing', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();
    existingSlot($otherOrgMembership);

    $this->actingAs($owner->user)->putJson("/api/v1/memberships/{$otherOrgMembership->id}/availabilities", [
        'slots' => [],
    ])->assertForbidden();

    expect(storedWeek($otherOrgMembership))->toHaveCount(1);
});

test('replace returns 409 subscriptions.inactive while the subscription is expired', function () {
    $membership = Membership::factory()->create();
    Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create(['organization_id' => $membership->organization_id]);
    existingSlot($membership);

    $this->actingAs($membership->user)->putJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'slots' => [],
    ])->assertStatus(409)->assertJsonPath('error.code', 'subscriptions.inactive');

    expect(storedWeek($membership))->toHaveCount(1);
});

test('index returns only the given membership slots, ordered by day_of_week then start_time', function () {
    $membership = Membership::factory()->create();
    $other = Availability::factory()->create();

    Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'day_of_week' => 2,
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);
    Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '14:00:00',
        'end_time' => '15:00:00',
    ]);
    Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/memberships/{$membership->id}/availabilities");

    $response->assertOk();
    $data = $response->json('data');
    expect($data)->toHaveCount(3);
    expect(array_column($data, 'day_of_week'))->toBe([1, 1, 2]);
    expect(array_column($data, 'start_time'))->toBe(['09:00', '14:00', '09:00']);
    expect(collect($data)->pluck('membership_id')->contains($other->membership_id))->toBeFalse();
});

test('index on a membership of another organization is rejected', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();
    Availability::factory()->create([
        'organization_id' => $otherOrgMembership->organization_id,
        'membership_id' => $otherOrgMembership->id,
    ]);

    $response = $this->actingAs($owner->user)->getJson("/api/v1/memberships/{$otherOrgMembership->id}/availabilities");

    $response->assertStatus(403);
});

test('a guest gets 401 on index and replace', function () {
    $membership = Membership::factory()->create();

    $this->getJson("/api/v1/memberships/{$membership->id}/availabilities")->assertStatus(401);
    $this->putJson("/api/v1/memberships/{$membership->id}/availabilities", ['slots' => []])->assertStatus(401);
});

test('the removed per-franja endpoints no longer exist', function () {
    $membership = Membership::factory()->create();
    $availability = existingSlot($membership);

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [])->assertStatus(405);
    $this->actingAs($membership->user)->patchJson("/api/v1/availabilities/{$availability->id}", [])->assertNotFound();
    $this->actingAs($membership->user)->deleteJson("/api/v1/availabilities/{$availability->id}")->assertNotFound();
});
