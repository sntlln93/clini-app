<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\ClinicalAccessAction;
use App\Enums\ClinicalAccessReason;
use App\Enums\ErrorCode;
use App\Enums\SubscriptionStatus;
use App\Models\Appointment;
use App\Models\ClinicalAccessLog;
use App\Models\ClinicalNote;
use App\Models\ClinicalRecordExport;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Subscription;
use App\Support\ClinicalAccess;
use App\Support\CurrentOrganization;
use Illuminate\Database\Eloquent\Builder;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * @return array{organization: Organization, professional: Membership, patient: Patient}
 */
function clinicalAccessFixture(): array
{
    $organization = Organization::factory()->center()->create();
    $professional = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $professional->user->update(['name' => 'Dra. Accesos']);
    $patient = Patient::factory()->create(['name' => 'Paciente del Registro']);
    $patient->organizations()->attach($organization->id);

    return ['organization' => $organization, 'professional' => $professional, 'patient' => $patient];
}

function appointmentDaysFromNow(Membership $membership, Patient $patient, int $days, AppointmentStatus $status = AppointmentStatus::Scheduled): Appointment
{
    return Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'start_at' => now()->addDays($days),
        'end_at' => now()->addDays($days)->addMinutes(30),
        'status' => $status,
    ]);
}

/**
 * @return Builder<ClinicalAccessLog>
 */
function accessLog(): Builder
{
    return ClinicalAccessLog::query()->withoutGlobalScope('organization');
}

test('reading a patient\'s notes leaves a row with who, on which patient, what and when', function () {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, -2);

    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")->assertOk();

    $row = accessLog()->sole();
    expect($row->organization_id)->toBe($professional->organization_id)
        ->and($row->membership_id)->toBe($professional->id)
        ->and($row->patient_id)->toBe($patient->id)
        ->and($row->action)->toBe(ClinicalAccessAction::NotesViewed)
        ->and($row->appointment_id)->toBeNull()
        ->and($row->reason)->toBeNull()
        ->and($row->created_at?->diffInSeconds(now()))->toBeLessThan(5.0);
});

test('reading a patient\'s indicated medication leaves a row too', function () {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, 1);

    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}/prescriptions")->assertOk();

    expect(accessLog()->sole()->action)->toBe(ClinicalAccessAction::PrescriptionsViewed);
});

test('reading the same records again within fifteen minutes keeps the first row instead of repeating it', function () {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    $appointment = appointmentDaysFromNow($professional, $patient, -2);
    $read = fn (string $uri) => $this->actingAs($professional->user)->getJson($uri)->assertOk();

    $read("/api/v1/patients/{$patient->id}/clinical-notes");
    freshRequestState();
    $this->travel(ClinicalAccess::READ_REPEAT_MINUTES - 1)->minutes();
    $read("/api/v1/patients/{$patient->id}/clinical-notes");
    freshRequestState();
    // Other records, read as many times, are reads of their own.
    $read("/api/v1/patients/{$patient->id}/prescriptions");
    freshRequestState();
    $read("/api/v1/appointments/{$appointment->id}/clinical-notes");
    freshRequestState();
    $this->travel(2)->minutes();
    $read("/api/v1/patients/{$patient->id}/clinical-notes");

    expect(accessLog()->orderBy('id')->get()->map(fn (ClinicalAccessLog $row): array => [$row->action, $row->appointment_id])->all())
        ->toBe([
            [ClinicalAccessAction::NotesViewed, null],
            [ClinicalAccessAction::PrescriptionsViewed, null],
            [ClinicalAccessAction::NotesViewed, $appointment->id],
            [ClinicalAccessAction::NotesViewed, null],
        ]);
});

test('another professional\'s read is never folded into someone else\'s', function () {
    ['organization' => $organization, 'professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    $colleague = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    appointmentDaysFromNow($professional, $patient, -2);
    appointmentDaysFromNow($colleague, $patient, 1);

    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")->assertOk();
    freshRequestState();
    $this->actingAs($colleague->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")->assertOk();

    expect(accessLog()->pluck('membership_id')->sort()->values()->all())
        ->toBe(collect([$professional->id, $colleague->id])->sort()->values()->all());
});

test('reading one own appointment\'s notes or medication is logged with the appointment and never takes a reason', function () {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    $old = appointmentDaysFromNow($professional, $patient, -90);

    $this->actingAs($professional->user)->getJson("/api/v1/appointments/{$old->id}/clinical-notes")->assertOk();
    freshRequestState();
    $this->actingAs($professional->user)->getJson("/api/v1/appointments/{$old->id}/prescriptions")->assertOk();

    expect(accessLog()->orderBy('id')->get()->map(fn (ClinicalAccessLog $row): array => [$row->action, $row->appointment_id])->all())
        ->toBe([[ClinicalAccessAction::NotesViewed, $old->id], [ClinicalAccessAction::PrescriptionsViewed, $old->id]]);
});

test('without an own appointment near today, the history takes a reason and nothing is answered or logged', function (string $uri) {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, -(ClinicalAccess::WINDOW_DAYS + 1));

    $this->actingAs($professional->user)->getJson(str_replace('{patient}', (string) $patient->id, $uri))
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::ClinicalAccessReasonRequired->value)
        ->assertJsonMissingPath('data');

    expect(accessLog()->count())->toBe(0)
        ->and(ClinicalRecordExport::query()->withoutGlobalScope('organization')->count())->toBe(0);
})->with([
    'the notes' => ['/api/v1/patients/{patient}/clinical-notes'],
    'the medication' => ['/api/v1/patients/{patient}/prescriptions'],
    'the export' => ['/api/v1/patients/{patient}/clinical-record?format=json'],
]);

test('the window is the professional\'s own appointments within seven days either side of now', function (int $days, AppointmentStatus $status, bool $open) {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, $days, $status);

    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")
        ->assertStatus($open ? 200 : 409);
})->with([
    'six days ago' => [-6, AppointmentStatus::Completed, true],
    'eight days ago' => [-8, AppointmentStatus::Completed, false],
    'in six days' => [6, AppointmentStatus::Scheduled, true],
    'in eight days' => [8, AppointmentStatus::Scheduled, false],
    'a no-show yesterday' => [-1, AppointmentStatus::NoShow, true],
    'cancelled for tomorrow' => [1, AppointmentStatus::Cancelled, false],
    'rescheduled away from tomorrow' => [1, AppointmentStatus::Rescheduled, false],
]);

test('a colleague\'s appointment near today opens nothing for another professional', function () {
    ['organization' => $organization, 'professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, -30);
    $colleague = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    appointmentDaysFromNow($colleague, $patient, 0);

    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")->assertStatus(409);
});

test('giving a reason records the exceptional access and opens the history for an hour', function () {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, -30);

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/exceptional-accesses", [
        'reason' => 'study_result',
        'reason_detail' => '  Llegó la ecografía.  ',
    ])->assertCreated()
        ->assertJsonPath('data.reason', 'study_result')
        ->assertJsonPath('data.patient_id', $patient->id);

    $access = accessLog()->sole();
    expect($access->action)->toBe(ClinicalAccessAction::ExceptionalAccess)
        ->and($access->reason)->toBe(ClinicalAccessReason::StudyResult)
        ->and($access->reason_detail)->toBe('Llegó la ecografía.')
        ->and($access->membership_id)->toBe($professional->id)
        ->and($access->patient_id)->toBe($patient->id);

    foreach (['clinical-notes', 'prescriptions', 'clinical-record?format=json'] as $read) {
        freshRequestState();
        $this->actingAs($professional->user)->get("/api/v1/patients/{$patient->id}/{$read}")->assertOk();
    }
    expect(accessLog()->where('action', ClinicalAccessAction::NotesViewed)->count())->toBe(1)
        ->and(accessLog()->where('action', ClinicalAccessAction::PrescriptionsViewed)->count())->toBe(1);

    $this->travel(ClinicalAccess::EXCEPTIONAL_ACCESS_MINUTES + 1)->minutes();
    freshRequestState();
    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")->assertStatus(409);
});

test('an exceptional access opens the history only to whoever declared it', function () {
    ['organization' => $organization, 'professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    $colleague = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    appointmentDaysFromNow($professional, $patient, -30);
    appointmentDaysFromNow($colleague, $patient, -30);
    openClinicalHistory($professional, $patient->id);

    $this->actingAs($colleague->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")->assertStatus(409);
});

test('the reason must be one of the list, and «otro» needs a few words', function (array $payload, string $field) {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, -30);

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/exceptional-accesses", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);

    expect(accessLog()->count())->toBe(0);
})->with([
    'missing' => [[], 'reason'],
    'unknown' => [['reason' => 'curiosity'], 'reason'],
    'other without words' => [['reason' => 'other'], 'reason_detail'],
    'other with blank words' => [['reason' => 'other', 'reason_detail' => '   '], 'reason_detail'],
    'too long' => [['reason' => 'emergency', 'reason_detail' => str_repeat('a', 501)], 'reason_detail'],
]);

test('«otro» with its words is accepted', function () {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, -30);

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/exceptional-accesses", [
        'reason' => 'other',
        'reason_detail' => 'Interconsulta pedida por un colega.',
    ])->assertCreated();

    expect(accessLog()->sole()->reason)->toBe(ClinicalAccessReason::Other);
});

test('with an appointment near today there is nothing to open, so no exceptional access is recorded', function () {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, 0);

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/exceptional-accesses", ['reason' => 'emergency'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', ErrorCode::ClinicalAccessReasonNotRequired->value);

    expect(accessLog()->count())->toBe(0);
});

test('only whoever may read the history can declare an exceptional access, never by role', function (string $role) {
    ['organization' => $organization, 'professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, -30);
    $intruder = Membership::factory()->{$role}()->create(['organization_id' => $organization->id]);

    $this->actingAs($intruder->user)->postJson("/api/v1/patients/{$patient->id}/exceptional-accesses", ['reason' => 'emergency'])
        ->assertForbidden();

    expect(accessLog()->count())->toBe(0);
})->with(['owner', 'admin', 'staff', 'professional']);

test('a denied read leaves no row', function () {
    ['organization' => $organization, 'professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, 0);
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $this->actingAs($owner->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")->assertForbidden();

    expect(accessLog()->count())->toBe(0);
});

test('an expired subscription can still open and read the history', function () {
    ['organization' => $organization, 'professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, -30);
    Subscription::query()->where('organization_id', $organization->id)->delete();
    Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create(['organization_id' => $organization->id]);

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/exceptional-accesses", ['reason' => 'emergency'])
        ->assertCreated();
    freshRequestState();
    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")->assertOk();
});

test('a patient\'s page says ahead whether the history opens, and whether it takes a reason', function () {
    ['organization' => $organization, 'professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, -30);
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $this->actingAs($owner->user)->getJson("/api/v1/patients/{$patient->id}")
        ->assertOk()
        ->assertJsonPath('data.can_view_clinical_notes', false)
        ->assertJsonPath('data.clinical_access_reason_required', false);

    freshRequestState();
    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}")
        ->assertJsonPath('data.can_view_clinical_notes', true)
        ->assertJsonPath('data.clinical_access_reason_required', true);

    openClinicalHistory($professional, $patient->id);
    freshRequestState();
    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}")
        ->assertJsonPath('data.clinical_access_reason_required', false);

    // Asking never counts as reading.
    expect(accessLog()->where('action', '!=', ClinicalAccessAction::ExceptionalAccess)->count())->toBe(0);

    // The list never computes it per row.
    freshRequestState();
    $this->actingAs($professional->user)->getJson('/api/v1/patients')
        ->assertOk()
        ->assertJsonMissingPath('data.0.can_view_clinical_notes');
});

test('an appointment near today opens the history without a reason', function () {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, 3);

    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}")
        ->assertJsonPath('data.can_view_clinical_notes', true)
        ->assertJsonPath('data.clinical_access_reason_required', false);
});

test('writing, amending and annulling a note each leave a row with the note', function () {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    $appointment = appointmentDaysFromNow($professional, $patient, 0);

    $noteId = $this->actingAs($professional->user)->postJson("/api/v1/appointments/{$appointment->id}/clinical-notes", ['body' => 'Primera nota.'])
        ->assertCreated()->json('data.id');
    freshRequestState();
    $this->actingAs($professional->user)->postJson("/api/v1/clinical-notes/{$noteId}/amendments", ['body' => 'Nota corregida.'])
        ->assertCreated();
    freshRequestState();
    $this->actingAs($professional->user)->postJson("/api/v1/clinical-notes/{$noteId}/annulment", ['reason' => 'Paciente equivocado.'])
        ->assertCreated();

    $rows = accessLog()->orderBy('id')->get();
    expect($rows->map(fn (ClinicalAccessLog $row) => $row->action)->all())
        ->toBe([ClinicalAccessAction::NoteWritten, ClinicalAccessAction::NoteAmended, ClinicalAccessAction::NoteAnnulled])
        ->and($rows->pluck('clinical_note_id')->unique()->all())->toBe([$noteId])
        ->and($rows->pluck('appointment_id')->unique()->all())->toBe([$appointment->id])
        ->and($rows->pluck('patient_id')->unique()->all())->toBe([$patient->id])
        ->and($rows->pluck('membership_id')->unique()->all())->toBe([$professional->id]);
});

test('issuing and amending indicated medication each leave a row with the record', function () {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    $appointment = appointmentDaysFromNow($professional, $patient, 0);
    $items = fn (string $medication): array => ['items' => [['medication' => $medication, 'dosage' => '1 cada 8 h', 'quantity' => 1]]];

    $prescriptionId = $this->actingAs($professional->user)->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", $items('Amoxicilina'))
        ->assertCreated()->json('data.id');
    freshRequestState();
    $this->actingAs($professional->user)->postJson("/api/v1/prescriptions/{$prescriptionId}/amendments", $items('Ibuprofeno'))
        ->assertCreated();

    $rows = accessLog()->orderBy('id')->get();
    expect($rows->map(fn (ClinicalAccessLog $row) => $row->action)->all())
        ->toBe([ClinicalAccessAction::PrescriptionIssued, ClinicalAccessAction::PrescriptionAmended])
        ->and($rows->pluck('prescription_id')->unique()->all())->toBe([$prescriptionId])
        ->and($rows->pluck('patient_id')->unique()->all())->toBe([$patient->id]);
});

test('a write the history rejects leaves no row', function () {
    ['professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    $appointment = appointmentDaysFromNow($professional, $patient, 0);
    $note = ClinicalNote::factory()->withBody('Sin cambios.')->create(['appointment_id' => $appointment->id]);
    $prescription = Prescription::factory()->create(['appointment_id' => $appointment->id]);
    $current = $prescription->versions()->sole()->items()->sole();

    $this->actingAs($professional->user)->postJson("/api/v1/clinical-notes/{$note->id}/amendments", ['body' => 'Sin cambios.'])
        ->assertStatus(409);
    freshRequestState();
    $this->actingAs($professional->user)->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", ['items' => [[
        'medication' => $current->medication,
        'presentation' => $current->presentation,
        'dosage' => $current->dosage,
        'quantity' => $current->quantity,
    ]]])->assertStatus(409);

    expect(accessLog()->count())->toBe(0);
});

test('the owner lists the practice\'s exceptional accesses, newest first, without the professional\'s words or anything clinical', function () {
    ['organization' => $organization, 'professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    appointmentDaysFromNow($professional, $patient, -30);
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/exceptional-accesses", ['reason' => 'emergency', 'reason_detail' => 'Dolor torácico.'])
        ->assertCreated();
    $this->travel(5)->minutes();
    freshRequestState();
    $this->actingAs($professional->user)->postJson("/api/v1/patients/{$patient->id}/exceptional-accesses", ['reason' => 'other', 'reason_detail' => 'Control de diabetes.'])
        ->assertCreated();
    freshRequestState();
    $this->actingAs($professional->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")->assertOk();

    // Another practice's accesses never show.
    $elsewhere = Membership::factory()->professional()->create();
    $elsewherePatient = Patient::factory()->create();
    appointmentDaysFromNow($elsewhere, $elsewherePatient, -30);
    openClinicalHistory($elsewhere, $elsewherePatient->id);

    freshRequestState();
    $response = $this->actingAs($owner->user)->getJson('/api/v1/exceptional-accesses');

    $response->assertOk()
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('data.0.reason', 'other')
        ->assertJsonPath('data.1.reason', 'emergency')
        ->assertJsonPath('data.0.professional', ['membership_id' => $professional->id, 'name' => 'Dra. Accesos'])
        ->assertJsonPath('data.0.patient', ['id' => $patient->id, 'name' => 'Paciente del Registro'])
        ->assertJsonMissingPath('data.0.reason_detail');
    expect($response->getContent())->not->toContain('Dolor torácico')
        ->not->toContain('Control de diabetes');
});

test('the list keeps who accessed after their membership is deactivated', function () {
    ['organization' => $organization, 'professional' => $professional, 'patient' => $patient] = clinicalAccessFixture();
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);
    openClinicalHistory($professional, $patient->id);
    $professional->delete();

    $this->actingAs($owner->user)->getJson('/api/v1/exceptional-accesses')
        ->assertOk()
        ->assertJsonPath('data.0.professional.name', 'Dra. Accesos');
});

test('the list of exceptional accesses is the owner\'s alone', function (string $role) {
    ['organization' => $organization] = clinicalAccessFixture();
    $member = Membership::factory()->{$role}()->create(['organization_id' => $organization->id]);

    $this->actingAs($member->user)->getJson('/api/v1/exceptional-accesses')->assertForbidden();
})->with(['admin', 'staff', 'professional']);
