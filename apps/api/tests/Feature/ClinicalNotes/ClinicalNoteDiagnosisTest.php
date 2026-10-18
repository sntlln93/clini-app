<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Http\Requests\ClinicalNotes\StoreClinicalNoteRequest;
use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\ClinicalNoteDiagnosis;
use App\Models\Icd10Code;
use App\Models\Membership;
use App\Support\ClinicalNoteDiagnoses;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function diagnosableAppointment(): Appointment
{
    $membership = Membership::factory()->create();

    return Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
    ]);
}

/**
 * A note whose version 1 carries the given diagnoses.
 *
 * @param  list<Icd10Code>  $codes
 */
function diagnosedNote(array $codes, string $body = 'Nota original.'): ClinicalNote
{
    $note = ClinicalNote::factory()->withBody($body)->create(['appointment_id' => diagnosableAppointment()->id]);
    ClinicalNoteDiagnoses::record($note->versions()->sole(), array_map(fn (Icd10Code $code) => $code->id, $codes));

    return $note;
}

test('a note is written with its diagnoses in the order they were sent', function () {
    $appointment = diagnosableAppointment();
    $pharyngitis = Icd10Code::factory()->create(['code' => 'J02.9', 'description' => 'Faringitis aguda, no especificada']);
    $headache = Icd10Code::factory()->create(['code' => 'R51', 'description' => 'Cefalea']);

    $response = $this->actingAs($appointment->membership->user)->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", [
        'body' => 'Dolor de garganta y de cabeza.',
        'icd10_code_ids' => [$headache->id, $pharyngitis->id],
    ]);

    $expected = [
        ['icd10_code_id' => $headache->id, 'code' => 'R51', 'description' => 'Cefalea'],
        ['icd10_code_id' => $pharyngitis->id, 'code' => 'J02.9', 'description' => 'Faringitis aguda, no especificada'],
    ];
    $response->assertCreated()
        ->assertJsonPath('data.diagnoses', $expected)
        ->assertJsonPath('data.versions.0.diagnoses', $expected);
});

test('a note can have no diagnosis at all', function (array $payload) {
    $appointment = diagnosableAppointment();

    $this->actingAs($appointment->membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", ['body' => 'Control.', ...$payload])
        ->assertCreated()
        ->assertJsonPath('data.diagnoses', []);

    expect(ClinicalNoteDiagnosis::count())->toBe(0);
})->with([
    'key left out' => [[]],
    'empty list' => [['icd10_code_ids' => []]],
]);

test('writing a note rejects an unknown, retired, repeated or excess code with 422', function (Closure $codeIds) {
    $appointment = diagnosableAppointment();

    $this->actingAs($appointment->membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", ['body' => 'Control.', 'icd10_code_ids' => $codeIds()])
        ->assertStatus(422);

    expect(ClinicalNote::count())->toBe(0);
})->with([
    'unknown' => [fn () => [999_999]],
    'retired' => [function () {
        $code = Icd10Code::factory()->create();
        $code->delete();

        return [$code->id];
    }],
    'repeated' => [function () {
        $code = Icd10Code::factory()->create();

        return [$code->id, $code->id];
    }],
    'too many' => [fn () => Icd10Code::factory()->count(StoreClinicalNoteRequest::MAX_DIAGNOSES + 1)->create()->modelKeys()],
    'not a list' => [fn () => 'J02.9'],
    'not an id' => [fn () => ['J02.9']],
]);

test('a note keeps the code and description it was written with when the catalog changes', function () {
    $code = Icd10Code::factory()->create(['code' => 'R51', 'description' => 'Cefalea']);
    $note = diagnosedNote([$code]);

    $code->update(['code' => 'R51.9', 'description' => 'Cefalea, no especificada']);
    $code->delete();

    $this->actingAs($note->author->user)->getJson("/api/v1/appointments/{$note->appointment_id}/clinical-notes")
        ->assertOk()
        ->assertJsonPath('data.0.diagnoses', [['icd10_code_id' => $code->id, 'code' => 'R51', 'description' => 'Cefalea']]);
});

test('amending the diagnoses adds a version and keeps the earlier ones as they were', function () {
    $headache = Icd10Code::factory()->create(['code' => 'R51', 'description' => 'Cefalea']);
    $migraine = Icd10Code::factory()->create(['code' => 'G43.9', 'description' => 'Migraña, no especificada']);
    $note = diagnosedNote([$headache]);

    $response = $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", [
        'body' => 'Nota original.',
        'icd10_code_ids' => [$migraine->id],
        'reason' => 'Era una migraña.',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.version', 2)
        ->assertJsonPath('data.diagnoses.*.code', ['G43.9'])
        ->assertJsonPath('data.versions.0.diagnoses.*.code', ['R51'])
        ->assertJsonPath('data.versions.1.diagnoses.*.code', ['G43.9']);
});

test('reordering the diagnoses is an amendment', function () {
    [$first, $second] = Icd10Code::factory()->count(2)->create();
    $note = diagnosedNote([$first, $second]);

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", [
        'body' => 'Nota original.',
        'icd10_code_ids' => [$second->id, $first->id],
    ])->assertCreated()->assertJsonPath('data.diagnoses.*.icd10_code_id', [$second->id, $first->id]);
});

test('an empty list removes every diagnosis in the new version', function () {
    $note = diagnosedNote([Icd10Code::factory()->create()]);

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", [
        'body' => 'Nota original.',
        'icd10_code_ids' => [],
    ])->assertCreated()
        ->assertJsonPath('data.diagnoses', [])
        ->assertJsonCount(1, 'data.versions.0.diagnoses');
});

test('an amendment that leaves the codes out keeps the current diagnoses', function () {
    $code = Icd10Code::factory()->create(['code' => 'R51']);
    $note = diagnosedNote([$code]);

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", ['body' => 'Nota corregida.'])
        ->assertCreated()
        ->assertJsonPath('data.versions.1.diagnoses.*.code', ['R51']);
});

test('an amendment that repeats the text and the diagnoses returns 409 and adds no version', function (Closure $payload) {
    $code = Icd10Code::factory()->create();
    $note = diagnosedNote([$code]);

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", $payload($code))
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::ClinicalNotesAmendmentUnchanged->value);

    expect($note->versions()->count())->toBe(1);
})->with([
    'codes sent again' => [fn (Icd10Code $code) => ['body' => 'Nota original.', 'icd10_code_ids' => [$code->id]]],
    'codes left out' => [fn (Icd10Code $code) => ['body' => 'Nota original.']],
]);

test('a kept diagnosis keeps the code and description it was written with, even if the catalog renamed or retired it', function (bool $sendCodes) {
    $code = Icd10Code::factory()->create(['code' => 'R51', 'description' => 'Cefalea']);
    $note = diagnosedNote([$code]);
    $code->update(['code' => 'R51.9', 'description' => 'Cefalea (renombrada)']);
    $code->delete();

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", [
        'body' => 'Nota corregida.',
        ...($sendCodes ? ['icd10_code_ids' => [$code->id]] : []),
    ])->assertCreated()
        ->assertJsonPath('data.diagnoses', [['icd10_code_id' => $code->id, 'code' => 'R51', 'description' => 'Cefalea']]);
})->with([
    'codes sent again' => [true],
    'codes left out' => [false],
]);

test('an added diagnosis is copied from the catalog as it is now', function () {
    $kept = Icd10Code::factory()->create(['code' => 'R51', 'description' => 'Cefalea']);
    $note = diagnosedNote([$kept]);
    $added = Icd10Code::factory()->create(['code' => 'J02.9', 'description' => 'Faringitis aguda, no especificada']);

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", [
        'body' => 'Nota original.',
        'icd10_code_ids' => [$added->id, $kept->id],
    ])->assertCreated()
        ->assertJsonPath('data.diagnoses.*.code', ['J02.9', 'R51']);
});

test('an amendment cannot add a retired code the note did not have', function () {
    $note = diagnosedNote([]);
    $retired = Icd10Code::factory()->create();
    $retired->delete();

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", [
        'body' => 'Nota corregida.',
        'icd10_code_ids' => [$retired->id],
    ])->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::ClinicalNotesDiagnosisRetired->value);

    expect($note->versions()->count())->toBe(1);
});

// The retired-code rule is decided after authorization, so a member who
// can't amend the note gets the same 403 whatever codes it carries.
test('someone who cannot amend the note gets 403 whether or not it has the retired code they send', function () {
    $retired = Icd10Code::factory()->create();
    $note = diagnosedNote([$retired]);
    $retired->delete();
    $other = Membership::factory()->create(['organization_id' => $note->organization_id]);
    $absent = Icd10Code::factory()->create();
    $absent->delete();

    foreach ([$retired, $absent] as $code) {
        app(CurrentOrganization::class)->set(null);
        $this->actingAs($other->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", [
            'body' => 'Otra cosa.',
            'icd10_code_ids' => [$code->id],
        ])->assertStatus(403);
    }
});

test('an amendment still rejects an id that is not in the catalog with 422', function () {
    $note = diagnosedNote([]);

    $this->actingAs($note->author->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", [
        'body' => 'Nota corregida.',
        'icd10_code_ids' => [999_999],
    ])->assertStatus(422)->assertJsonValidationErrors('icd10_code_ids.0');
});

test('the patient page lists every note with its diagnoses', function () {
    $code = Icd10Code::factory()->create(['code' => 'R51', 'description' => 'Cefalea']);
    $note = diagnosedNote([$code]);

    $this->actingAs($note->author->user)->getJson("/api/v1/patients/{$note->appointment->patient_id}/clinical-notes")
        ->assertOk()
        ->assertJsonPath('data.0.diagnoses', [['icd10_code_id' => $code->id, 'code' => 'R51', 'description' => 'Cefalea']]);
});
