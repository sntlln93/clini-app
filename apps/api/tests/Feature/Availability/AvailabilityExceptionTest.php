<?php

declare(strict_types=1);

use App\Models\AvailabilityException;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('store creates a professional-scoped blocked exception with a reason', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
        'reason' => 'Turno médico personal',
    ]);

    $response->assertCreated();
    $row = DB::table('availability_exceptions')->where('membership_id', $membership->id)->first();
    expect($row->organization_id)->toBe($membership->organization_id);
    expect($row->type)->toBe('blocked');
    expect($row->reason)->toBe('Turno médico personal');
});

test('store creates an org-wide exception with membership_id null', function () {
    $membership = Membership::factory()->owner()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'type' => 'blocked',
        'start_at' => '2026-12-25 00:00:00',
        'end_at' => '2026-12-26 00:00:00',
        'reason' => 'Feriado',
    ]);

    $response->assertCreated();
    $response->assertJsonPath('data.membership_id', null);
    $row = DB::table('availability_exceptions')
        ->where('organization_id', $membership->organization_id)
        ->whereNull('membership_id')
        ->first();
    expect($row)->not->toBeNull();
});

test('store creates an extra exception', function () {
    $membership = Membership::factory()->create();

    $response = $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $membership->id,
        'type' => 'extra',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ]);

    $response->assertCreated();
    $response->assertJsonPath('data.type', 'extra');
});

test('store with type outside blocked or extra returns 422', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $membership->id,
        'type' => 'holiday',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ])->assertStatus(422)->assertJsonValidationErrors('type');
});

test('store with end_at <= start_at returns 422', function () {
    $membership = Membership::factory()->create();

    $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 11:00:00',
        'end_at' => '2026-08-10 09:00:00',
    ])->assertStatus(422)->assertJsonValidationErrors('end_at');

    $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 09:00:00',
    ])->assertStatus(422)->assertJsonValidationErrors('end_at');
});

test('store with a membership_id from another organization returns 422', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();

    $response = $this->actingAs($owner->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $otherOrgMembership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ]);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('membership_id');
});

test('store overlapping an existing exception of the same membership and type returns 409 merge_required', function () {
    $membership = Membership::factory()->create();
    AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ]);

    $response = $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 10:00:00',
        'end_at' => '2026-08-10 12:00:00',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', 'availability.exception_merge_required');
    expect(DB::table('availability_exceptions')->where('membership_id', $membership->id)->count())->toBe(1);
});

test('store overlapping an existing exception of the same membership but a different type returns 409 type_conflict', function () {
    $membership = Membership::factory()->create();
    AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ]);

    $response = $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $membership->id,
        'type' => 'extra',
        'start_at' => '2026-08-10 10:00:00',
        'end_at' => '2026-08-10 12:00:00',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', 'availability.exception_type_conflict');
    $response->assertJsonPath('error.context.existing_type', 'blocked');
});

test('store adjacent to an existing exception of the same membership and type returns 409 merge_required', function () {
    $membership = Membership::factory()->create();
    AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ]);

    $response = $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 11:00:00',
        'end_at' => '2026-08-10 12:00:00',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', 'availability.exception_merge_required');
});

test('store with merge true collapses two same-type conflicting exceptions into one row carrying the new reason', function () {
    $membership = Membership::factory()->create();
    AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
        'reason' => 'Original',
    ]);

    $response = $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 10:00:00',
        'end_at' => '2026-08-10 12:00:00',
        'reason' => 'Nuevo motivo',
        'merge' => true,
    ]);

    $response->assertCreated();
    $rows = DB::table('availability_exceptions')->where('membership_id', $membership->id)->get();
    expect($rows)->toHaveCount(1);
    expect($rows->first()->start_at)->toBe('2026-08-10 09:00:00');
    expect($rows->first()->end_at)->toBe('2026-08-10 12:00:00');
    expect($rows->first()->reason)->toBe('Nuevo motivo');
});

test('store fully contained within an existing exception of the same membership and type returns 409 already_covered and changes nothing', function () {
    $membership = Membership::factory()->create();
    AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 12:00:00',
    ]);

    $response = $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 10:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', 'availability.exception_already_covered');
    expect(DB::table('availability_exceptions')->where('membership_id', $membership->id)->count())->toBe(1);
});

test('store of an org-wide exception overlapping an existing professional-scoped one succeeds', function () {
    $membership = Membership::factory()->owner()->create();
    AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ]);

    $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ])->assertCreated();
});

test('store of an org-wide exception overlapping an existing org-wide one returns 409 merge_required', function () {
    $membership = Membership::factory()->owner()->create();
    AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => null,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ]);

    $response = $this->actingAs($membership->user)->postJson('/api/v1/availability-exceptions', [
        'type' => 'blocked',
        'start_at' => '2026-08-10 10:00:00',
        'end_at' => '2026-08-10 12:00:00',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', 'availability.exception_merge_required');
});

test('index returns the organization exceptions ordered by start_at and never leaks another organization rows', function () {
    $membership = Membership::factory()->create();
    $otherOrgException = AvailabilityException::factory()->create();

    $later = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'start_at' => '2026-08-15 09:00:00',
        'end_at' => '2026-08-15 11:00:00',
    ]);
    $earlier = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'start_at' => '2026-08-01 09:00:00',
        'end_at' => '2026-08-01 11:00:00',
    ]);

    $response = $this->actingAs($membership->user)->getJson('/api/v1/availability-exceptions');

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids->toArray())->toBe([$earlier->id, $later->id]);
    expect($ids->contains($otherOrgException->id))->toBeFalse();
});

test('index filtered by membership_id returns that membership exceptions plus org-wide ones, excluding another professional', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $target = Membership::factory()->create(['organization_id' => $organization->id]);
    $another = Membership::factory()->create(['organization_id' => $organization->id]);

    $targetException = AvailabilityException::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $target->id,
    ]);
    $orgWideException = AvailabilityException::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => null,
    ]);
    $anotherException = AvailabilityException::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $another->id,
    ]);

    $response = $this->actingAs($owner->user)->getJson("/api/v1/availability-exceptions?membership_id={$target->id}");

    $response->assertOk();
    $ids = collect($response->json('data'))->pluck('id');
    expect($ids->toArray())->toEqualCanonicalizing([$targetException->id, $orgWideException->id]);
    expect($ids->contains($anotherException->id))->toBeFalse();
});

test('update changes type, start_at, end_at and reason without self-colliding', function () {
    $membership = Membership::factory()->create();
    $exception = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
        'reason' => 'Original',
    ]);

    $response = $this->actingAs($membership->user)->patchJson("/api/v1/availability-exceptions/{$exception->id}", [
        'membership_id' => $membership->id,
        'type' => 'extra',
        'start_at' => '2026-08-10 09:30:00',
        'end_at' => '2026-08-10 11:30:00',
        'reason' => 'Actualizado',
    ]);

    $response->assertOk();
    $row = DB::table('availability_exceptions')->where('id', $exception->id)->first();
    expect($row->type)->toBe('extra');
    expect($row->reason)->toBe('Actualizado');
});

test('update with membership_id null in the body does not reassign a professional own exception to org-wide', function () {
    $organization = Organization::factory()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $exception = AvailabilityException::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ]);

    $response = $this->actingAs($professional->user)->patchJson("/api/v1/availability-exceptions/{$exception->id}", [
        'membership_id' => null,
        'type' => 'extra',
        'start_at' => '2026-08-10 09:30:00',
        'end_at' => '2026-08-10 11:30:00',
    ]);

    $response->assertOk();
    $row = DB::table('availability_exceptions')->where('id', $exception->id)->first();
    expect($row->membership_id)->toBe($professional->id);
});

test('update with another membership_id in the body does not reassign the exception to that membership', function () {
    $organization = Organization::factory()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $another = Membership::factory()->create(['organization_id' => $organization->id]);
    $exception = AvailabilityException::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ]);

    $response = $this->actingAs($professional->user)->patchJson("/api/v1/availability-exceptions/{$exception->id}", [
        'membership_id' => $another->id,
        'type' => 'extra',
        'start_at' => '2026-08-10 09:30:00',
        'end_at' => '2026-08-10 11:30:00',
    ]);

    $response->assertOk();
    $row = DB::table('availability_exceptions')->where('id', $exception->id)->first();
    expect($row->membership_id)->toBe($professional->id);
});

test('an owner updating an org-wide exception fields succeeds and it stays org-wide', function () {
    $membership = Membership::factory()->owner()->create();
    $exception = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => null,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
        'reason' => 'Feriado',
    ]);

    $response = $this->actingAs($membership->user)->patchJson("/api/v1/availability-exceptions/{$exception->id}", [
        'type' => 'extra',
        'start_at' => '2026-08-10 09:30:00',
        'end_at' => '2026-08-10 11:30:00',
        'reason' => 'Actualizado',
    ]);

    $response->assertOk();
    $row = DB::table('availability_exceptions')->where('id', $exception->id)->first();
    expect($row->membership_id)->toBeNull();
    expect($row->type)->toBe('extra');
    expect($row->reason)->toBe('Actualizado');
});

test('a professional holding only availability.manage.own gets 403 on update and destroy of another professional exception and an org-wide exception, 2xx on its own', function () {
    $organization = Organization::factory()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $another = Membership::factory()->create(['organization_id' => $organization->id]);

    $ownException = AvailabilityException::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ]);
    $anotherException = AvailabilityException::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $another->id,
        'type' => 'blocked',
        'start_at' => '2026-08-11 09:00:00',
        'end_at' => '2026-08-11 11:00:00',
    ]);
    $orgWideException = AvailabilityException::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => null,
        'type' => 'blocked',
        'start_at' => '2026-08-12 09:00:00',
        'end_at' => '2026-08-12 11:00:00',
    ]);

    $this->actingAs($professional->user)->patchJson("/api/v1/availability-exceptions/{$anotherException->id}", [
        'type' => 'blocked',
        'start_at' => '2026-08-11 10:00:00',
        'end_at' => '2026-08-11 12:00:00',
    ])->assertStatus(403);
    $this->actingAs($professional->user)->deleteJson("/api/v1/availability-exceptions/{$anotherException->id}")->assertStatus(403);

    $this->actingAs($professional->user)->patchJson("/api/v1/availability-exceptions/{$orgWideException->id}", [
        'type' => 'blocked',
        'start_at' => '2026-08-12 10:00:00',
        'end_at' => '2026-08-12 12:00:00',
    ])->assertStatus(403);
    $this->actingAs($professional->user)->deleteJson("/api/v1/availability-exceptions/{$orgWideException->id}")->assertStatus(403);

    $this->actingAs($professional->user)->patchJson("/api/v1/availability-exceptions/{$ownException->id}", [
        'type' => 'extra',
        'start_at' => '2026-08-10 09:30:00',
        'end_at' => '2026-08-10 11:30:00',
    ])->assertSuccessful();
    $this->actingAs($professional->user)->deleteJson("/api/v1/availability-exceptions/{$ownException->id}")->assertNoContent();
});

test('destroy deletes the exception and returns 204, including an org-wide one', function () {
    $membership = Membership::factory()->owner()->create();
    $exception = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $orgWideException = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => null,
    ]);

    $this->actingAs($membership->user)->deleteJson("/api/v1/availability-exceptions/{$exception->id}")->assertNoContent();
    $this->actingAs($membership->user)->deleteJson("/api/v1/availability-exceptions/{$orgWideException->id}")->assertNoContent();

    expect(DB::table('availability_exceptions')->where('id', $exception->id)->count())->toBe(0);
    expect(DB::table('availability_exceptions')->where('id', $orgWideException->id)->count())->toBe(0);
});

test('a professional holding only availability.manage.own gets 403 on org-wide and another professional store, 2xx on its own; an owner gets 2xx on all three', function () {
    $organization = Organization::factory()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $another = Membership::factory()->create(['organization_id' => $organization->id]);
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $this->actingAs($professional->user)->postJson('/api/v1/availability-exceptions', [
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ])->assertStatus(403);

    $this->actingAs($professional->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $another->id,
        'type' => 'blocked',
        'start_at' => '2026-08-11 09:00:00',
        'end_at' => '2026-08-11 11:00:00',
    ])->assertStatus(403);

    $this->actingAs($professional->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $professional->id,
        'type' => 'blocked',
        'start_at' => '2026-08-12 09:00:00',
        'end_at' => '2026-08-12 11:00:00',
    ])->assertSuccessful();

    $this->actingAs($owner->user)->postJson('/api/v1/availability-exceptions', [
        'type' => 'blocked',
        'start_at' => '2026-09-10 09:00:00',
        'end_at' => '2026-09-10 11:00:00',
    ])->assertSuccessful();

    $this->actingAs($owner->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $another->id,
        'type' => 'blocked',
        'start_at' => '2026-09-11 09:00:00',
        'end_at' => '2026-09-11 11:00:00',
    ])->assertSuccessful();

    $this->actingAs($owner->user)->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $professional->id,
        'type' => 'blocked',
        'start_at' => '2026-09-12 09:00:00',
        'end_at' => '2026-09-12 11:00:00',
    ])->assertSuccessful();
});

test('update on an exception from another organization returns 403', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();
    $exception = AvailabilityException::factory()->create([
        'organization_id' => $otherOrgMembership->organization_id,
        'membership_id' => $otherOrgMembership->id,
    ]);

    $this->actingAs($owner->user)->patchJson("/api/v1/availability-exceptions/{$exception->id}", [
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ])->assertStatus(403);
});

test('destroy on an exception from another organization returns 403', function () {
    $owner = Membership::factory()->owner()->create();
    $otherOrgMembership = Membership::factory()->create();
    $exception = AvailabilityException::factory()->create([
        'organization_id' => $otherOrgMembership->organization_id,
        'membership_id' => $otherOrgMembership->id,
    ]);

    $this->actingAs($owner->user)->deleteJson("/api/v1/availability-exceptions/{$exception->id}")->assertStatus(403);
});

test('a guest gets 401 on index, store, update and destroy', function () {
    $membership = Membership::factory()->create();
    $exception = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $this->getJson('/api/v1/availability-exceptions')->assertStatus(401);
    $this->postJson('/api/v1/availability-exceptions', [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ])->assertStatus(401);
    $this->patchJson("/api/v1/availability-exceptions/{$exception->id}", [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ])->assertStatus(401);
    $this->deleteJson("/api/v1/availability-exceptions/{$exception->id}")->assertStatus(401);
});

test('update of an exception to a range overlapping another exception of the same membership and type returns 409 merge_required and changes nothing', function () {
    $membership = Membership::factory()->create();
    $updated = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
    ]);
    $other = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 13:00:00',
        'end_at' => '2026-08-10 15:00:00',
    ]);

    $response = $this->actingAs($membership->user)->patchJson("/api/v1/availability-exceptions/{$updated->id}", [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 14:00:00',
        'end_at' => '2026-08-10 16:00:00',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', 'availability.exception_merge_required');
    expect($response->json('error.context'))->toHaveKeys(['merged', 'absorbed']);

    $updatedRow = DB::table('availability_exceptions')->where('id', $updated->id)->first();
    expect($updatedRow->start_at)->toBe('2026-08-10 09:00:00');
    expect($updatedRow->end_at)->toBe('2026-08-10 11:00:00');
    $otherRow = DB::table('availability_exceptions')->where('id', $other->id)->first();
    expect($otherRow->start_at)->toBe('2026-08-10 13:00:00');
    expect($otherRow->end_at)->toBe('2026-08-10 15:00:00');
});

test('update of an exception with merge true collapses it with another same-type exception into one row carrying the new reason', function () {
    $membership = Membership::factory()->create();
    $updated = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 11:00:00',
        'reason' => 'Original',
    ]);
    $other = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 13:00:00',
        'end_at' => '2026-08-10 15:00:00',
        'reason' => 'Otro motivo',
    ]);

    $response = $this->actingAs($membership->user)->patchJson("/api/v1/availability-exceptions/{$updated->id}", [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 14:00:00',
        'end_at' => '2026-08-10 16:00:00',
        'reason' => 'Nuevo motivo',
        'merge' => true,
    ]);

    $response->assertOk();
    $rows = DB::table('availability_exceptions')->where('membership_id', $membership->id)->get();
    expect($rows)->toHaveCount(1);
    expect($rows->first()->id)->toBe($updated->id);
    expect($rows->first()->start_at)->toBe('2026-08-10 13:00:00');
    expect($rows->first()->end_at)->toBe('2026-08-10 16:00:00');
    expect($rows->first()->reason)->toBe('Nuevo motivo');
    expect(DB::table('availability_exceptions')->where('id', $other->id)->exists())->toBeFalse();
});

test('update of an exception to a range fully contained within another same-type exception returns 409 already_covered and changes nothing', function () {
    $membership = Membership::factory()->create();
    $updated = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 10:00:00',
    ]);
    $other = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 13:00:00',
        'end_at' => '2026-08-10 17:00:00',
    ]);

    $response = $this->actingAs($membership->user)->patchJson("/api/v1/availability-exceptions/{$updated->id}", [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 14:00:00',
        'end_at' => '2026-08-10 15:00:00',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', 'availability.exception_already_covered');

    $updatedRow = DB::table('availability_exceptions')->where('id', $updated->id)->first();
    expect($updatedRow->start_at)->toBe('2026-08-10 09:00:00');
    expect($updatedRow->end_at)->toBe('2026-08-10 10:00:00');
    $otherRow = DB::table('availability_exceptions')->where('id', $other->id)->first();
    expect($otherRow->start_at)->toBe('2026-08-10 13:00:00');
    expect($otherRow->end_at)->toBe('2026-08-10 17:00:00');
});

test('update of an exception to a range overlapping an exception of a different type returns 409 type_conflict and merge true still returns the same conflict', function () {
    $membership = Membership::factory()->create();
    $updated = AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 09:00:00',
        'end_at' => '2026-08-10 10:00:00',
    ]);
    AvailabilityException::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'type' => 'extra',
        'start_at' => '2026-08-10 13:00:00',
        'end_at' => '2026-08-10 15:00:00',
    ]);

    $response = $this->actingAs($membership->user)->patchJson("/api/v1/availability-exceptions/{$updated->id}", [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 14:00:00',
        'end_at' => '2026-08-10 16:00:00',
    ]);

    $response->assertStatus(409);
    $response->assertJsonPath('error.code', 'availability.exception_type_conflict');
    $response->assertJsonPath('error.context.existing_type', 'extra');

    $retry = $this->actingAs($membership->user)->patchJson("/api/v1/availability-exceptions/{$updated->id}", [
        'membership_id' => $membership->id,
        'type' => 'blocked',
        'start_at' => '2026-08-10 14:00:00',
        'end_at' => '2026-08-10 16:00:00',
        'merge' => true,
    ]);

    $retry->assertStatus(409);
    $retry->assertJsonPath('error.code', 'availability.exception_type_conflict');
});
