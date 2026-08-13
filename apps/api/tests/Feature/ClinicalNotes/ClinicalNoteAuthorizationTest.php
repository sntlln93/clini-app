<?php

declare(strict_types=1);

use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Models\Organization;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('a professional gets 403 on index for an appointment booked to another professional of the same organization', function () {
    $organization = Organization::factory()->create();
    $professionalA = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $professionalB = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professionalB->id,
    ]);

    $this->actingAs($professionalA->user)->getJson("/api/v1/appointments/{$appointment->id}/clinical-notes")
        ->assertStatus(403);
});

test('a professional gets 403 on store for another professional\'s appointment', function () {
    $organization = Organization::factory()->create();
    $professionalA = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $professionalB = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professionalB->id,
    ]);

    $this->actingAs($professionalA->user)->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", [
        'body' => 'Intento no autorizado.',
    ])->assertStatus(403);
});

test('a professional gets 403, not 404, on update of a note they did not author, in their own organization', function () {
    $organization = Organization::factory()->create();
    $professionalA = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $professionalB = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professionalB->id,
    ]);
    $note = ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $organization->id,
        'membership_id' => $professionalB->id,
    ]);

    $this->actingAs($professionalA->user)->patchJson("/api/v1/clinical-notes/{$note->id}", [
        'body' => 'Edición no autorizada.',
    ])->assertStatus(403);
});

test('a professional gets 403, not 404, on destroy of a note they did not author, in their own organization', function () {
    $organization = Organization::factory()->create();
    $professionalA = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $professionalB = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professionalB->id,
    ]);
    $note = ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $organization->id,
        'membership_id' => $professionalB->id,
    ]);

    $this->actingAs($professionalA->user)->deleteJson("/api/v1/clinical-notes/{$note->id}")
        ->assertStatus(403);
});

test('an owner membership gets 403 on index, store, update and destroy over another membership\'s appointment/notes', function () {
    $organization = Organization::factory()->create();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
    ]);
    $note = ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
    ]);

    $this->actingAs($owner->user)->getJson("/api/v1/appointments/{$appointment->id}/clinical-notes")
        ->assertStatus(403);
    $this->actingAs($owner->user)->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", [
        'body' => 'Nota de owner.',
    ])->assertStatus(403);
    $this->actingAs($owner->user)->patchJson("/api/v1/clinical-notes/{$note->id}", [
        'body' => 'Edición de owner.',
    ])->assertStatus(403);
    $this->actingAs($owner->user)->deleteJson("/api/v1/clinical-notes/{$note->id}")
        ->assertStatus(403);
});

test('an admin membership gets 403 on index, store, update and destroy over another membership\'s appointment/notes', function () {
    $organization = Organization::factory()->create();
    $admin = Membership::factory()->admin()->create(['organization_id' => $organization->id]);
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
    ]);
    $note = ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
    ]);

    $this->actingAs($admin->user)->getJson("/api/v1/appointments/{$appointment->id}/clinical-notes")
        ->assertStatus(403);
    $this->actingAs($admin->user)->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", [
        'body' => 'Nota de admin.',
    ])->assertStatus(403);
    $this->actingAs($admin->user)->patchJson("/api/v1/clinical-notes/{$note->id}", [
        'body' => 'Edición de admin.',
    ])->assertStatus(403);
    $this->actingAs($admin->user)->deleteJson("/api/v1/clinical-notes/{$note->id}")
        ->assertStatus(403);
});

test('a staff membership gets 403 on index, store, update and destroy over another membership\'s appointment/notes', function () {
    $organization = Organization::factory()->create();
    $staff = Membership::factory()->staff()->create(['organization_id' => $organization->id]);
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
    ]);
    $note = ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
    ]);

    $this->actingAs($staff->user)->getJson("/api/v1/appointments/{$appointment->id}/clinical-notes")
        ->assertStatus(403);
    $this->actingAs($staff->user)->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", [
        'body' => 'Nota de staff.',
    ])->assertStatus(403);
    $this->actingAs($staff->user)->patchJson("/api/v1/clinical-notes/{$note->id}", [
        'body' => 'Edición de staff.',
    ])->assertStatus(403);
    $this->actingAs($staff->user)->deleteJson("/api/v1/clinical-notes/{$note->id}")
        ->assertStatus(403);
});

// The tenant global scope (BelongsToOrganization) does not exclude a
// cross-organization row from implicit route-model binding, because
// SubstituteBindings runs as part of the framework's own `api` middleware
// group, which wraps (and therefore runs before) this app's own
// `organization` route middleware — CurrentOrganization is not set yet
// when the note is looked up, so the row IS found, and the mismatch is
// only caught afterwards by the policy, yielding 403. This is the same,
// consistent behavior already covered for Appointment in
// AppointmentCancelTest.php ("cancelling an appointment belonging to
// another organization is rejected" -> 403), not unique to clinical notes.
//
// Deliberately split into two tests (rather than two HTTP calls in one
// test): CurrentOrganization is bound as a singleton that survives across
// simulated requests within a single test method, so a second call in the
// same test would find it already set from the first call's middleware
// and get scoped out (404) instead of exercising the real, first-request
// production behavior (403) that both cases are meant to cover.
test('a note belonging to another organization returns 403 on update', function () {
    $membership = Membership::factory()->create();
    $otherOrgMembership = Membership::factory()->create();
    $otherOrgAppointment = Appointment::factory()->create([
        'organization_id' => $otherOrgMembership->organization_id,
        'membership_id' => $otherOrgMembership->id,
    ]);
    $note = ClinicalNote::factory()->create([
        'appointment_id' => $otherOrgAppointment->id,
        'organization_id' => $otherOrgMembership->organization_id,
        'membership_id' => $otherOrgMembership->id,
    ]);

    $this->actingAs($membership->user)->patchJson("/api/v1/clinical-notes/{$note->id}", [
        'body' => 'Edición cruzada.',
    ])->assertStatus(403);
});

test('a note belonging to another organization returns 403 on destroy', function () {
    $membership = Membership::factory()->create();
    $otherOrgMembership = Membership::factory()->create();
    $otherOrgAppointment = Appointment::factory()->create([
        'organization_id' => $otherOrgMembership->organization_id,
        'membership_id' => $otherOrgMembership->id,
    ]);
    $note = ClinicalNote::factory()->create([
        'appointment_id' => $otherOrgAppointment->id,
        'organization_id' => $otherOrgMembership->organization_id,
        'membership_id' => $otherOrgMembership->id,
    ]);

    $this->actingAs($membership->user)->deleteJson("/api/v1/clinical-notes/{$note->id}")
        ->assertStatus(403);
});

test('a guest gets 401 on index, store, update and destroy', function () {
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
    $note = ClinicalNote::factory()->create([
        'appointment_id' => $appointment->id,
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    $this->getJson("/api/v1/appointments/{$appointment->id}/clinical-notes")->assertStatus(401);
    $this->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", ['body' => 'x'])->assertStatus(401);
    $this->patchJson("/api/v1/clinical-notes/{$note->id}", ['body' => 'y'])->assertStatus(401);
    $this->deleteJson("/api/v1/clinical-notes/{$note->id}")->assertStatus(401);
});
