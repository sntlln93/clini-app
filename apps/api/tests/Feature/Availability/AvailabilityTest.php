<?php

declare(strict_types=1);

use App\Models\Availability;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('store creates a slot for the given membership and persists it scoped to the active organization', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '09:00',
        'end_time' => '12:00',
    ]);

    $response->assertCreated();
    $row = DB::table('availabilities')->where('membership_id', $membership->id)->first();
    expect($row->organization_id)->toBe($membership->organization_id);
    expect($row->day_of_week)->toBe(1);
    expect($row->start_time)->toBe('09:00:00');
    expect($row->end_time)->toBe('12:00:00');
});

test('store accepts two non-overlapping slots on the same day for the same membership', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '09:00',
        'end_time' => '12:00',
    ])->assertCreated();

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '14:00',
        'end_time' => '18:00',
    ])->assertCreated();

    expect(DB::table('availabilities')->where('membership_id', $membership->id)->count())->toBe(2);
});

test('store with end_time <= start_time returns 422', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '09:00',
        'end_time' => '08:00',
    ])->assertStatus(422)->assertJsonValidationErrors('end_time');

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '09:00',
        'end_time' => '09:00',
    ])->assertStatus(422)->assertJsonValidationErrors('end_time');
});

test('store with day_of_week 7 or -1 returns 422', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => 7,
        'start_time' => '09:00',
        'end_time' => '12:00',
    ])->assertStatus(422)->assertJsonValidationErrors('day_of_week');

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => -1,
        'start_time' => '09:00',
        'end_time' => '12:00',
    ])->assertStatus(422)->assertJsonValidationErrors('day_of_week');
});

test('store with a slot overlapping an existing slot of the same membership and day returns 409 merge_required', function () {
    $membership = Membership::factory()->create();
    Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '11:00',
        'end_time' => '13:00',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', 'availability.slot_merge_required');
    $response->assertJsonPath('error.context.merged', ['start' => '09:00', 'end' => '13:00']);
    $response->assertJsonPath('error.context.absorbed', [['start' => '09:00', 'end' => '12:00']]);
    expect(DB::table('availabilities')->where('membership_id', $membership->id)->count())->toBe(1);
});

test('store with a slot only touching an existing one at the boundary returns 409 merge_required', function () {
    $membership = Membership::factory()->create();
    Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '12:00',
        'end_time' => '14:00',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', 'availability.slot_merge_required');
    $response->assertJsonPath('error.context.merged', ['start' => '09:00', 'end' => '14:00']);
});

test('store with merge true collapses an overlapping and adjacent slot into a single union row', function () {
    $membership = Membership::factory()->create();
    Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);
    Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '12:00:00',
        'end_time' => '14:00:00',
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '11:00',
        'end_time' => '13:00',
        'merge' => true,
    ]);

    $response->assertCreated();
    $rows = DB::table('availabilities')->where('membership_id', $membership->id)->where('day_of_week', 1)->get();
    expect($rows)->toHaveCount(1);
    expect($rows->first()->start_time)->toBe('09:00:00');
    expect($rows->first()->end_time)->toBe('14:00:00');
});

test('store with a slot fully contained within an existing one returns 409 already_covered and changes nothing', function () {
    $membership = Membership::factory()->create();
    Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);

    $response = $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '10:00',
        'end_time' => '11:00',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', 'availability.slot_already_covered');
    $response->assertJsonPath('error.context.covering', ['start' => '09:00', 'end' => '12:00']);
    expect(DB::table('availabilities')->where('membership_id', $membership->id)->count())->toBe(1);
});

test('store with a slot overlapping in clock time but on a different day_of_week succeeds', function () {
    $membership = Membership::factory()->create();
    Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);

    $this->actingAs($membership->user)->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => 2,
        'start_time' => '09:00',
        'end_time' => '12:00',
    ])->assertCreated();
});

test('store on a membership belonging to another organization returns 422', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();

    $response = $this->actingAs($owner->user)->postJson("/api/v1/memberships/{$otherOrgMembership->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '09:00',
        'end_time' => '12:00',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('membership_id');
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

test('update changes start_time and end_time of an existing slot without self-colliding', function () {
    $membership = Membership::factory()->create();
    $availability = Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);

    $response = $this->actingAs($membership->user)->patchJson("/api/v1/availabilities/{$availability->id}", [
        'day_of_week' => 1,
        'start_time' => '10:00',
        'end_time' => '13:00',
    ]);

    $response->assertOk();
    $row = DB::table('availabilities')->where('id', $availability->id)->first();
    expect($row->start_time)->toBe('10:00:00');
    expect($row->end_time)->toBe('13:00:00');
});

test('update of a slot belonging to another organization returns 403', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();
    $availability = Availability::factory()->create([
        'organization_id' => $otherOrgMembership->organization_id,
        'membership_id' => $otherOrgMembership->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);

    $response = $this->actingAs($owner->user)->patchJson("/api/v1/availabilities/{$availability->id}", [
        'day_of_week' => 1,
        'start_time' => '10:00',
        'end_time' => '13:00',
    ]);

    $response->assertStatus(403);
});

test('destroy deletes the slot and returns 204', function () {
    $membership = Membership::factory()->create();
    $availability = Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $response = $this->actingAs($membership->user)->deleteJson("/api/v1/availabilities/{$availability->id}");

    $response->assertNoContent();
    expect(DB::table('availabilities')->where('id', $availability->id)->count())->toBe(0);
});

test('authorization matrix on store: owner on any professional succeeds, professional on own succeeds, professional on another 403, staff succeeds', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $anotherMember = Membership::factory()->create(['organization_id' => $organization->id]);
    $staff = Membership::factory()->staff()->create(['organization_id' => $organization->id]);

    $this->actingAs($owner->user)->postJson("/api/v1/memberships/{$anotherMember->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '09:00',
        'end_time' => '12:00',
    ])->assertSuccessful();

    $this->actingAs($professional->user)->postJson("/api/v1/memberships/{$professional->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '09:00',
        'end_time' => '12:00',
    ])->assertSuccessful();

    $this->actingAs($professional->user)->postJson("/api/v1/memberships/{$anotherMember->id}/availabilities", [
        'day_of_week' => 2,
        'start_time' => '09:00',
        'end_time' => '12:00',
    ])->assertStatus(403);

    $this->actingAs($staff->user)->postJson("/api/v1/memberships/{$anotherMember->id}/availabilities", [
        'day_of_week' => 3,
        'start_time' => '09:00',
        'end_time' => '12:00',
    ])->assertSuccessful();
});

test('a professional holding only availability.manage.own gets 403 on update and destroy of another professional slot in the same organization, 2xx on its own', function () {
    $organization = Organization::factory()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $another = Membership::factory()->create(['organization_id' => $organization->id]);

    $ownSlot = Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);
    $anotherSlot = Availability::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $another->id,
        'day_of_week' => 1,
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);

    $this->actingAs($professional->user)->patchJson("/api/v1/availabilities/{$anotherSlot->id}", [
        'day_of_week' => 1,
        'start_time' => '10:00',
        'end_time' => '13:00',
    ])->assertStatus(403);
    $this->actingAs($professional->user)->deleteJson("/api/v1/availabilities/{$anotherSlot->id}")->assertStatus(403);

    $this->actingAs($professional->user)->patchJson("/api/v1/availabilities/{$ownSlot->id}", [
        'day_of_week' => 1,
        'start_time' => '10:00',
        'end_time' => '13:00',
    ])->assertSuccessful();
    $this->actingAs($professional->user)->deleteJson("/api/v1/availabilities/{$ownSlot->id}")->assertNoContent();
});

test('a guest gets 401 on index, store, update and destroy', function () {
    $membership = Membership::factory()->create();
    $availability = Availability::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $this->getJson("/api/v1/memberships/{$membership->id}/availabilities")->assertStatus(401);
    $this->postJson("/api/v1/memberships/{$membership->id}/availabilities", [
        'day_of_week' => 1,
        'start_time' => '09:00',
        'end_time' => '12:00',
    ])->assertStatus(401);
    $this->patchJson("/api/v1/availabilities/{$availability->id}", [
        'day_of_week' => 1,
        'start_time' => '09:00',
        'end_time' => '12:00',
    ])->assertStatus(401);
    $this->deleteJson("/api/v1/availabilities/{$availability->id}")->assertStatus(401);
});
