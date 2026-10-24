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

function amendableNote(string $body = 'Nota original.'): ClinicalNote
{
    $membership = Membership::factory()->create();
    $appointment = Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);

    return ClinicalNote::factory()->withBody($body)->create(['appointment_id' => $appointment->id]);
}

test('an amendment adds version 2 and keeps version 1 as it was', function () {
    $note = amendableNote();

    $response = $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", [
        'body' => 'Nota corregida.',
        'reason' => 'Error de tipeo en la dosis.',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.id', $note->id)
        ->assertJsonPath('data.body', 'Nota corregida.')
        ->assertJsonPath('data.version', 2)
        ->assertJsonPath('data.versions.0.version', 1)
        ->assertJsonPath('data.versions.0.body', 'Nota original.')
        ->assertJsonPath('data.versions.0.reason', null)
        ->assertJsonPath('data.versions.1.version', 2)
        ->assertJsonPath('data.versions.1.body', 'Nota corregida.')
        ->assertJsonPath('data.versions.1.reason', 'Error de tipeo en la dosis.');
    expect($response->json('data.amended_at'))->not->toBeNull();

    $versions = $note->versions()->get();
    expect($versions->pluck('body')->all())->toBe(['Nota original.', 'Nota corregida.'])
        ->and($versions->pluck('membership_id')->unique()->all())->toBe([$note->membership_id]);
});

test('the note keeps its author and creation time across amendments', function () {
    $note = amendableNote();
    $createdAt = $note->created_at;

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", ['body' => 'Segunda.'])
        ->assertCreated();
    freshRequestState();
    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", ['body' => 'Tercera.'])
        ->assertCreated()
        ->assertJsonPath('data.version', 3)
        ->assertJsonPath('data.created_at', $createdAt->toJSON());

    $fresh = ClinicalNote::findOrFail($note->id);
    expect($fresh->membership_id)->toBe($note->membership_id)
        ->and($fresh->created_at->equalTo($createdAt))->toBeTrue();
});

test('the reason is optional, and a blank one is stored as null', function () {
    $note = amendableNote();

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", [
        'body' => 'Nota corregida.',
        'reason' => '   ',
    ])->assertCreated()->assertJsonPath('data.versions.1.reason', null);
});

test('an amendment returns 422 for a missing or too long body, or a too long reason', function (array $payload, string $field) {
    $note = amendableNote();

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", $payload)
        ->assertStatus(422)
        ->assertJsonValidationErrors($field);

    expect($note->versions()->count())->toBe(1);
})->with([
    'missing body' => [[], 'body'],
    'body too long' => [['body' => str_repeat('a', 5001)], 'body'],
    'reason too long' => [['body' => 'Nota corregida.', 'reason' => str_repeat('a', 501)], 'reason'],
]);

test('an amendment that repeats the current text returns 409 and adds no version', function () {
    $note = amendableNote('Sin cambios.');

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", ['body' => 'Sin cambios.'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::ClinicalNotesAmendmentUnchanged->value);

    expect($note->versions()->count())->toBe(1);
});

test('an annulled note cannot be amended', function () {
    $note = amendableNote();
    $note->annulment()->create(['membership_id' => $note->membership_id, 'reason' => 'Paciente equivocado.']);

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", ['body' => 'Otra cosa.'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::ClinicalNotesAnnulled->value);

    expect($note->versions()->count())->toBe(1);
});

test('the appointment and patient listings show the current text with its history', function () {
    $note = amendableNote();
    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", ['body' => 'Nota corregida.'])
        ->assertCreated();
    openClinicalHistory($note->author, $note->appointment->patient_id);

    foreach (["/api/v1/appointments/{$note->appointment_id}/clinical-notes", "/api/v1/patients/{$note->appointment->patient_id}/clinical-notes"] as $uri) {
        freshRequestState();
        $this->actingAs($note->author->user)->getJson($uri)
            ->assertOk()
            ->assertJsonPath('data.0.body', 'Nota corregida.')
            ->assertJsonPath('data.0.version', 2)
            ->assertJsonCount(2, 'data.0.versions')
            ->assertJsonPath('data.0.versions.0.body', 'Nota original.');
    }
});
