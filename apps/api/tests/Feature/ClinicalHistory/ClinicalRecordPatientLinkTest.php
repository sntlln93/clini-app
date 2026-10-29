<?php

declare(strict_types=1);

use App\Enums\ClinicalAccessAction;
use App\Http\Resources\ClinicalRecords\ClinicalRecordResource;
use App\Models\Appointment;
use App\Models\ClinicalAccessLog;
use App\Models\ClinicalNote;
use App\Models\Patient;
use App\Models\Prescription;
use App\Support\ClinicalRecordLoader;
use App\Support\CurrentOrganization;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

// A clinical record keeps its appointment's patient, and that appointment then keeps it too (#360).

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * Runs one statement in its own savepoint, so the error it raises doesn't
 * abort the test's transaction.
 */
function inOwnSavepoint(Closure $statement): Closure
{
    return fn () => DB::transaction($statement);
}

test('the database rejects a clinical record whose patient isn\'t its appointment\'s', function (Closure $insert) {
    $appointment = Appointment::factory()->create();
    $otherPatient = Patient::factory()->create();

    expect(inOwnSavepoint(fn () => $insert($appointment, $otherPatient)))
        ->toThrow(QueryException::class, 'appointment_id_patient_id_foreign');
})->with([
    'clinical note' => [function (Appointment $appointment, Patient $patient): void {
        DB::table('clinical_notes')->insert([
            'organization_id' => $appointment->organization_id,
            'appointment_id' => $appointment->id,
            'patient_id' => $patient->id,
            'membership_id' => $appointment->membership_id,
            'created_at' => now(),
        ]);
    }],
    'indicated medication' => [function (Appointment $appointment, Patient $patient): void {
        DB::table('prescriptions')->insert([
            'organization_id' => $appointment->organization_id,
            'appointment_id' => $appointment->id,
            'patient_id' => $patient->id,
            'membership_id' => $appointment->membership_id,
            'issued_at' => now(),
            'created_at' => now(),
        ]);
    }],
    'access log row' => [function (Appointment $appointment, Patient $patient): void {
        DB::table('clinical_access_logs')->insert([
            'organization_id' => $appointment->organization_id,
            'membership_id' => $appointment->membership_id,
            'patient_id' => $patient->id,
            'action' => ClinicalAccessAction::NotesViewed->value,
            'appointment_id' => $appointment->id,
        ]);
    }],
]);

test('the database rejects changing the patient of an appointment with clinical records', function (Closure $record) {
    $appointment = Appointment::factory()->create();
    $record($appointment);
    $otherPatient = Patient::factory()->create();

    expect(inOwnSavepoint(fn () => DB::table('appointments')->where('id', $appointment->id)->update(['patient_id' => $otherPatient->id])))
        ->toThrow(QueryException::class, 'An appointment with clinical records keeps its patient');

    expect($appointment->fresh()?->patient_id)->toBe($appointment->patient_id);
})->with([
    'a clinical note' => [fn (Appointment $appointment) => ClinicalNote::factory()->create(['appointment_id' => $appointment->id])],
    'indicated medication' => [fn (Appointment $appointment) => Prescription::factory()->create(['appointment_id' => $appointment->id])],
]);

test('an appointment with only access log rows keeps its patient too', function () {
    $appointment = Appointment::factory()->create();
    ClinicalAccessLog::query()->create([
        'organization_id' => $appointment->organization_id,
        'membership_id' => $appointment->membership_id,
        'patient_id' => $appointment->patient_id,
        'action' => ClinicalAccessAction::NotesViewed,
        'appointment_id' => $appointment->id,
    ]);
    $otherPatient = Patient::factory()->create();

    expect(inOwnSavepoint(fn () => DB::table('appointments')->where('id', $appointment->id)->update(['patient_id' => $otherPatient->id])))
        ->toThrow(QueryException::class, 'appointment_id_patient_id_foreign');
});

test('an appointment without clinical records can still change its patient', function () {
    $appointment = Appointment::factory()->create();
    $otherPatient = Patient::factory()->create();

    DB::table('appointments')->where('id', $appointment->id)->update(['patient_id' => $otherPatient->id]);

    expect($appointment->fresh()?->patient_id)->toBe($otherPatient->id);
});

test('a note is found by its own patient, without going through its appointment', function () {
    $note = ClinicalNote::factory()->create();

    $query = ClinicalNote::query()->withoutGlobalScopes()->forPatient($note->patient_id);

    expect($query->toRawSql())->not->toContain('appointments')
        ->and($query->pluck('id')->all())->toBe([$note->id]);
});

test('who attended a patient is found by the notes\' own patient, not through their appointments', function () {
    $note = ClinicalNote::factory()->create();

    $sql = Patient::query()->attendedBy($note->organization_id, $note->membership_id)->toRawSql();

    expect($sql)->toContain('"patients"."id" = "clinical_notes"."patient_id"')
        ->and($sql)->not->toContain('"appointments"."id" = "clinical_notes"."appointment_id"')
        ->and(Patient::query()->attendedBy($note->organization_id, $note->membership_id)->pluck('id')->all())->toBe([$note->patient_id]);
});

test('the export loads notes and medication by their own patient and files them under their appointment', function () {
    $note = ClinicalNote::factory()->create();
    $prescription = Prescription::factory()->create(['appointment_id' => $note->appointment_id]);
    app(CurrentOrganization::class)->set($note->organization_id);

    $patient = ClinicalRecordLoader::patient(Patient::findOrFail($note->patient_id), $note->organization_id, $prescription->membership_id);

    expect($patient->relationLoaded('clinicalNotes'))->toBeTrue()
        ->and($patient->relationLoaded('prescriptions'))->toBeTrue()
        ->and($patient->appointments->sole()->relationLoaded('clinicalNotes'))->toBeFalse();

    $appointment = (new ClinicalRecordResource($patient))->resolve()['appointments'][0];
    expect(array_column($appointment['clinical_notes'], 'id'))->toBe([$note->id])
        ->and(array_column($appointment['prescriptions'], 'id'))->toBe([$prescription->id]);
});
