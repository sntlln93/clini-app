<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\ClinicalAccessAction;
use App\Enums\ErrorCode;
use App\Enums\SubscriptionStatus;
use App\Models\Appointment;
use App\Models\BloodTypeRecord;
use App\Models\ClinicalAccessLog;
use App\Models\ClinicalNote;
use App\Models\MedicalHistoryEntry;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Subscription;
use App\Models\VitalSign;
use App\Support\ClinicalAccess;
use App\Support\CurrentOrganization;
use Illuminate\Database\Eloquent\Model;

/*
 * Writing in the clinical history outside an appointment (#382, ADR 0037): by who attends the patient, under the same
 * window or exceptional access as a read of the history, with a null appointment as the record's mark.
 */

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * A professional who attended the patient a few days ago, with no appointment today.
 *
 * @return array{organization: Organization, professional: Membership, patient: Patient, appointment: Appointment}
 */
function outsideAppointmentFixture(int $daysFromNow = -3): array
{
    $organization = Organization::factory()->center()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $patient = Patient::factory()->create();
    $patient->organizations()->attach($organization->id);
    $appointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
        'patient_id' => $patient->id,
        'start_at' => now()->addDays($daysFromNow),
        'end_at' => now()->addDays($daysFromNow)->addMinutes(30),
        'status' => $daysFromNow < 0 ? AppointmentStatus::Completed : AppointmentStatus::Scheduled,
    ]);

    return ['organization' => $organization, 'professional' => $professional, 'patient' => $patient, 'appointment' => $appointment];
}

/**
 * Each record of the history a professional adds, with what its write logs.
 *
 * @return array<string, array{string, array<string, mixed>, class-string<Model>, ClinicalAccessAction, string}>
 */
function outsideAppointmentWrites(): array
{
    return [
        'a note' => ['clinical-notes', ['body' => 'Llegó el resultado del laboratorio: normal.'], ClinicalNote::class, ClinicalAccessAction::NoteWritten, 'clinical_note_id'],
        'medication' => ['prescriptions', ['items' => [['medication' => 'Amoxicilina', 'presentation' => null, 'dosage' => '1 cada 8 h', 'quantity' => 1]]], Prescription::class, ClinicalAccessAction::PrescriptionIssued, 'prescription_id'],
        'a measurement' => ['vital-signs', ['weight_kg' => 70.5, 'height_cm' => 170], VitalSign::class, ClinicalAccessAction::VitalSignRecorded, 'vital_sign_id'],
        'a blood type' => ['blood-types', ['blood_type' => 'A+'], BloodTypeRecord::class, ClinicalAccessAction::BloodTypeRecorded, 'blood_type_record_id'],
        'an allergy' => ['medical-history-entries', ['category' => 'allergy', 'description' => 'Penicilina', 'reaction' => 'Urticaria'], MedicalHistoryEntry::class, ClinicalAccessAction::MedicalHistoryRecorded, 'medical_history_entry_id'],
    ];
}

/**
 * @param  class-string<Model>  $model
 */
function outsideAppointmentCount(string $model): int
{
    return $model::query()->withoutGlobalScope('organization')->count();
}

test('a professional who attends the patient records outside an appointment, marked by its null appointment in the record and in its log row', function (string $path, array $payload, string $model, ClinicalAccessAction $action, string $logColumn) {
    ['organization' => $organization, 'professional' => $professional, 'patient' => $patient] = outsideAppointmentFixture();
    $elsewhere = Appointment::factory()->create();

    $response = $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/{$path}", [
        ...$payload,
        // Never taken from the request.
        'appointment_id' => $elsewhere->id,
        'patient_id' => $elsewhere->patient_id,
    ]);

    $response->assertCreated()->assertJsonPath('data.appointment_id', null);

    $record = $model::query()->withoutGlobalScope('organization')->findOrFail($response->json('data.id'));
    $log = ClinicalAccessLog::query()->withoutGlobalScope('organization')->where('action', $action)->sole();

    expect($record->getAttribute('appointment_id'))->toBeNull()
        ->and($record->getAttribute('patient_id'))->toBe($patient->id)
        ->and($record->getAttribute('membership_id'))->toBe($professional->id)
        ->and($record->getAttribute('organization_id'))->toBe($organization->id)
        ->and($log->appointment_id)->toBeNull()
        ->and($log->patient_id)->toBe($patient->id)
        ->and($log->membership_id)->toBe($professional->id)
        ->and($log->getAttribute($logColumn))->toBe($record->getKey());
})->with(outsideAppointmentWrites());

test('without an own appointment near today, recording outside one takes a reason, and an exceptional access opens it', function (string $path, array $payload, string $model) {
    ['professional' => $professional, 'patient' => $patient] = outsideAppointmentFixture(-(ClinicalAccess::WINDOW_DAYS + 1));

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/{$path}", $payload)
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::ClinicalAccessReasonRequired->value);

    expect(outsideAppointmentCount($model))->toBe(0)
        ->and(ClinicalAccessLog::query()->withoutGlobalScope('organization')->count())->toBe(0);

    openClinicalHistory($professional, $patient->id);
    freshRequestState();

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/{$path}", $payload)->assertCreated();
})->with(outsideAppointmentWrites());

test('an exceptional access that ran out closes recording outside an appointment again', function () {
    ['professional' => $professional, 'patient' => $patient] = outsideAppointmentFixture(-(ClinicalAccess::WINDOW_DAYS + 1));
    openClinicalHistory($professional, $patient->id);

    $this->travel(ClinicalAccess::EXCEPTIONAL_ACCESS_MINUTES + 1)->minutes();

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/clinical-notes", ['body' => 'Tarde.'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::ClinicalAccessReasonRequired->value);
});

test('who never attended the patient can\'t record outside an appointment, even with an exceptional access', function (string $path, array $payload, string $model) {
    ['organization' => $organization, 'patient' => $patient] = outsideAppointmentFixture();
    $colleague = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    openClinicalHistory($colleague, $patient->id);

    $this->actingAs($colleague->user)->postJson("/api/v1/patients/{$patient->id}/{$path}", $payload)->assertForbidden();

    expect(outsideAppointmentCount($model))->toBe(0);
})->with(outsideAppointmentWrites());

test('a role never records outside an appointment by itself', function (string $role) {
    ['organization' => $organization, 'patient' => $patient] = outsideAppointmentFixture();
    $member = Membership::factory()->{$role}()->create(['organization_id' => $organization->id]);

    $this->actingAs($member->user)->postJson("/api/v1/patients/{$patient->id}/clinical-notes", ['body' => 'Nota.'])
        ->assertForbidden();

    expect(outsideAppointmentCount(ClinicalNote::class))->toBe(0);
})->with(['owner', 'admin', 'staff']);

test('attending the patient in another organization opens nothing in this one', function () {
    ['patient' => $patient] = outsideAppointmentFixture();
    $other = Membership::factory()->onPaidPlan()->professional()->create();
    $patient->organizations()->attach($other->organization_id);

    $this->actingAs($other->user)->postJson("/api/v1/patients/{$patient->id}/clinical-notes", ['body' => 'Nota.'])
        ->assertForbidden();
});

test('a guest can\'t record outside an appointment', function () {
    ['patient' => $patient] = outsideAppointmentFixture();

    $this->postJson("/api/v1/patients/{$patient->id}/clinical-notes", ['body' => 'Nota.'])->assertUnauthorized();
});

test('medication outside an appointment keeps its plan, and nothing is written while the subscription is expired', function () {
    $organization = Organization::factory()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $patient = Patient::factory()->create();
    Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $professional->id,
        'patient_id' => $patient->id,
        'start_at' => now()->subDay(),
        'end_at' => now()->subDay()->addMinutes(30),
    ]);

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/prescriptions", [])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'plans.feature_unavailable')
        ->assertJsonPath('error.context.feature', 'prescriptions');

    Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create(['organization_id' => $organization->id]);
    freshRequestState();

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/clinical-notes", ['body' => 'Nota.'])
        ->assertStatus(409);

    expect(outsideAppointmentCount(ClinicalNote::class))->toBe(0);
});

test('medication outside an appointment is screened against the patient\'s allergies like on one', function () {
    ['professional' => $professional, 'patient' => $patient, 'appointment' => $appointment] = outsideAppointmentFixture();
    $allergy = MedicalHistoryEntry::factory()->outsideAppointment($appointment)->create();
    $allergy->versions()->create(['version' => 2, 'membership_id' => $professional->id, 'description' => 'Ibuprofeno', 'reaction' => 'Urticaria']);
    $payload = ['items' => [['medication' => 'Ibuprofeno 400', 'presentation' => null, 'dosage' => '1 cada 8 h', 'quantity' => 1]]];

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/prescriptions", $payload)
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'prescriptions.allergy_warning');

    $shown = ClinicalAccessLog::query()->withoutGlobalScope('organization')->where('action', ClinicalAccessAction::AllergyWarningShown)->sole();
    expect($shown->appointment_id)->toBeNull()
        ->and(outsideAppointmentCount(Prescription::class))->toBe(0);

    $version = $allergy->versions()->reorder('version', 'desc')->firstOrFail();
    freshRequestState();

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/prescriptions", [
        ...$payload,
        'confirmed_allergies' => [['version_id' => $version->id, 'detail_shown' => true]],
    ])->assertCreated()->assertJsonPath('data.allergy_warning_overridden', true);
});

test('the medication form outside an appointment reads the patient\'s current allergies, under the same window', function () {
    ['professional' => $professional, 'patient' => $patient, 'appointment' => $appointment] = outsideAppointmentFixture();
    $allergy = MedicalHistoryEntry::factory()->outsideAppointment($appointment)->create();

    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}/allergies")
        ->assertOk()
        ->assertJsonPath('data.0.id', $allergy->id)
        ->assertJsonPath('meta.reason_required', false);

    $this->travel(ClinicalAccess::WINDOW_DAYS)->days();
    freshRequestState();

    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}/allergies")
        ->assertOk()
        ->assertJsonCount(0, 'data')
        ->assertJsonPath('meta.reason_required', true);
});

test('who doesn\'t attend the patient can\'t read their current allergies', function () {
    ['organization' => $organization, 'patient' => $patient] = outsideAppointmentFixture();
    $colleague = Membership::factory()->professional()->create(['organization_id' => $organization->id]);

    $this->actingAs($colleague->user)->getJson("/api/v1/patients/{$patient->id}/allergies")->assertForbidden();
});

test('a record outside an appointment keeps the read rule: another professional reads it only with the patient\'s code', function () {
    ['organization' => $organization, 'patient' => $patient, 'appointment' => $appointment] = outsideAppointmentFixture();
    $note = ClinicalNote::factory()->outsideAppointment($appointment)->withBody('Fuera de turno.')->create();
    $colleague = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $colleague->id,
        'patient_id' => $patient->id,
        'start_at' => now()->subDay(),
        'end_at' => now()->subDay()->addMinutes(30),
    ]);

    $this->actingAs($colleague->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")
        ->assertOk()
        ->assertJsonCount(0, 'data');

    shareAccessCode($colleague, $patient->id);
    freshRequestState();

    $this->actingAs($colleague->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")
        ->assertOk()
        ->assertJsonPath('data.0.id', $note->id)
        ->assertJsonPath('data.0.appointment_id', null);
});

test('a record outside an appointment is amended and annulled by its author like any other', function () {
    ['professional' => $professional, 'appointment' => $appointment] = outsideAppointmentFixture();
    $note = ClinicalNote::factory()->outsideAppointment($appointment)->create();

    $this->actingAs($professional->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", ['body' => 'Corregida.'])
        ->assertCreated();
    freshRequestState();
    $this->actingAs($professional->user)->postJson("/api/v1/clinical-notes/{$note->id}/annulment", ['reason' => 'Paciente equivocado.'])
        ->assertCreated();

    expect(ClinicalAccessLog::query()->withoutGlobalScope('organization')->pluck('appointment_id')->all())->toBe([null, null]);
});

test('the export files the records outside an appointment in a group of their own, never under an appointment', function () {
    ['professional' => $professional, 'patient' => $patient, 'appointment' => $appointment] = outsideAppointmentFixture();
    $inside = ClinicalNote::factory()->withBody('En el turno.')->create(['appointment_id' => $appointment->id]);
    $note = ClinicalNote::factory()->outsideAppointment($appointment)->withBody('Fuera de turno.')->create();
    $prescription = Prescription::factory()->outsideAppointment($appointment)->create();
    $vitalSign = VitalSign::factory()->outsideAppointment($appointment)->create();
    $bloodType = BloodTypeRecord::factory()->outsideAppointment($appointment)->create();
    $entry = MedicalHistoryEntry::factory()->outsideAppointment($appointment)->create();

    $response = $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}/clinical-record?format=json")
        ->assertOk();

    expect($response->json('appointments.0.clinical_notes.*.id'))->toBe([$inside->id])
        ->and($response->json('outside_appointments.clinical_notes.*.id'))->toBe([$note->id])
        ->and($response->json('outside_appointments.clinical_notes.0.versions.0.body'))->toBe('Fuera de turno.')
        ->and($response->json('outside_appointments.prescriptions.*.id'))->toBe([$prescription->id])
        ->and($response->json('outside_appointments.vital_signs.*.id'))->toBe([$vitalSign->id])
        ->and($response->json('blood_types.0.id'))->toBe($bloodType->id)
        ->and($response->json('blood_types.0.appointment_id'))->toBeNull()
        ->and($response->json('medical_history.0.id'))->toBe($entry->id)
        ->and($response->json('medical_history.0.appointment_id'))->toBeNull();
});

test('another author\'s records outside an appointment stay out of the export without the patient\'s code', function () {
    ['organization' => $organization, 'patient' => $patient, 'appointment' => $appointment] = outsideAppointmentFixture();
    ClinicalNote::factory()->outsideAppointment($appointment)->create();
    $colleague = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $colleague->id,
        'patient_id' => $patient->id,
        'start_at' => now()->subDay(),
        'end_at' => now()->subDay()->addMinutes(30),
    ]);

    $this->actingAs($colleague->user)->getJson("/api/v1/patients/{$patient->id}/clinical-record?format=json")
        ->assertOk()
        ->assertJsonCount(0, 'outside_appointments.clinical_notes');
});
