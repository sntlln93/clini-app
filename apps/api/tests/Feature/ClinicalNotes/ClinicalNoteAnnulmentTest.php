<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function annullableNote(): ClinicalNote
{
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    return ClinicalNote::factory()->withBody('Nota del paciente equivocado.')->create(['appointment_id' => $appointment->id]);
}

test('annulling keeps the note and its text, marked as annulled with the reason', function () {
    $note = annullableNote();

    $response = $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/annulment", [
        'reason' => 'Cargada en el turno de otro paciente.',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.body', 'Nota del paciente equivocado.')
        ->assertJsonPath('data.annulment.reason', 'Cargada en el turno de otro paciente.');
    expect($response->json('data.annulment.created_at'))->not->toBeNull();

    $annulment = ClinicalNote::findOrFail($note->id)->annulment()->sole();
    expect($annulment->membership_id)->toBe($note->membership_id);

    freshRequestState();
    $this->actingAs($note->author->user)->getJson("/api/v1/appointments/{$note->appointment_id}/clinical-notes")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.annulment.reason', 'Cargada en el turno de otro paciente.');
});

test('annulling requires a reason of 3 to 500 characters', function (array $payload) {
    $note = annullableNote();

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/annulment", $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors('reason');

    expect($note->annulment()->exists())->toBeFalse();
})->with([
    'missing' => [[]],
    'too short' => [['reason' => 'no']],
    'too long' => [['reason' => str_repeat('a', 501)]],
]);

test('annulling an annulled note returns 409 and keeps the first annulment', function () {
    $note = annullableNote();
    $note->annulment()->create(['membership_id' => $note->membership_id, 'reason' => 'Primera anulación.']);

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/annulment", ['reason' => 'Segunda anulación.'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::ClinicalNotesAnnulled->value);

    expect($note->annulment()->sole()->reason)->toBe('Primera anulación.');
});
