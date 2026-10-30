<?php

declare(strict_types=1);

use App\Enums\ClinicalAccessAction;
use App\Enums\ClinicalAccessReason;
use App\Enums\ClinicalRecordExportFormat;
use App\Enums\ClinicalRecordExportScope;
use App\Enums\MedicalHistoryCategory;
use App\Enums\SubscriptionStatus;
use App\Models\Appointment;
use App\Models\BloodTypeRecord;
use App\Models\ClinicalAccessLog;
use App\Models\ClinicalNote;
use App\Models\ClinicalRecordExport;
use App\Models\Icd10Code;
use App\Models\MedicalHistoryEntry;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\PatientAccessCode;
use App\Models\Prescription;
use App\Models\Subscription;
use App\Models\VitalSign;
use App\Support\ClinicalNoteDiagnoses;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

function professionalIn(Organization $organization, string $name): Membership
{
    $membership = Membership::factory()->onPaidPlan()->professional()->create(['organization_id' => $organization->id]);
    $membership->user->update(['name' => $name]);

    return $membership;
}

function appointmentWith(Membership $membership, Patient $patient, string $startAt = '2026-09-01 13:00:00'): Appointment
{
    return Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'start_at' => $startAt,
        'end_at' => now()->parse($startAt)->addMinutes(30),
    ]);
}

/**
 * A patient seen by two professionals of one practice, plus history in another practice that must never cross over:
 * an amended note with diagnoses, an annulled note by the colleague, the exporter's own amended medication and the
 * colleague's.
 *
 * @return array{exporter: Membership, colleague: Membership, patient: Patient, organization: Organization}
 */
function sharedPatientHistory(): array
{
    $organization = Organization::factory()->create(['name' => 'Consultorio Norte', 'timezone' => 'America/Argentina/Buenos_Aires']);
    $exporter = professionalIn($organization, 'Dra. Exportadora');
    $colleague = professionalIn($organization, 'Dr. Colega');
    $patient = Patient::factory()->create(['name' => 'Paciente Compartido']);

    $own = appointmentWith($exporter, $patient, '2026-09-01 13:00:00');
    $note = ClinicalNote::factory()->withBody('Primera versión de la nota.')->create(['appointment_id' => $own->id]);
    $amendment = $note->versions()->create([
        'version' => 2,
        'membership_id' => $exporter->id,
        'body' => 'Nota enmendada.',
        'reason' => 'Faltaba un dato.',
    ]);
    ClinicalNoteDiagnoses::record($amendment, [Icd10Code::factory()->create(['code' => 'J06.9', 'description' => 'Infección aguda de las vías respiratorias superiores'])->id]);
    $prescription = Prescription::factory()->create(['appointment_id' => $own->id]);
    $prescription->versions()->create(['version' => 2, 'membership_id' => $exporter->id, 'reason' => 'Cambio de dosis.'])
        ->items()->create(['position' => 0, 'medication' => 'Ibuprofeno', 'presentation' => 'Comprimidos 400 mg', 'dosage' => '1 cada 8 h', 'quantity' => 2]);

    $theirs = appointmentWith($colleague, $patient, '2026-09-10 15:00:00');
    $annulled = ClinicalNote::factory()->withBody('Nota del colega.')->create(['appointment_id' => $theirs->id]);
    $annulled->annulment()->create(['membership_id' => $colleague->id, 'reason' => 'Paciente equivocado.']);
    $theirPrescription = Prescription::factory()->create(['appointment_id' => $theirs->id]);
    $theirPrescription->versions()->sole()->items()->sole();

    $elsewhere = Organization::factory()->create(['name' => 'Otro Consultorio']);
    $outsider = professionalIn($elsewhere, 'Dr. De Afuera');
    $outside = appointmentWith($outsider, $patient, '2026-08-01 13:00:00');
    ClinicalNote::factory()->withBody('Nota de otro consultorio.')->create(['appointment_id' => $outside->id]);
    Prescription::factory()->create(['appointment_id' => $outside->id]);

    // Every appointment is weeks before today, so the history opens as an exceptional access would (#325), and the
    // colleague's records with the code the patient shared (#364).
    openClinicalHistory($exporter, $patient->id);
    openClinicalHistory($outsider, $patient->id);
    shareAccessCode($exporter, $patient->id, $own);

    return ['exporter' => $exporter, 'colleague' => $colleague, 'patient' => $patient, 'organization' => $organization];
}

test('the attending professional exports the patient history as JSON with every act, its author and its versions', function () {
    ['exporter' => $exporter, 'colleague' => $colleague, 'patient' => $patient] = sharedPatientHistory();

    $response = $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=json");

    // Data, not a file: the panel builds the download (ADR 0023).
    $response->assertOk()
        ->assertHeader('Content-Type', 'application/json')
        ->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeaderMissing('Content-Disposition');
    expect($response->headers->get('Cache-Control'))->toContain('no-store');

    $record = $response->json();
    expect($record['export']['organization'])->toBe('Consultorio Norte')
        ->and($record['export']['generated_by']['name'])->toBe('Dra. Exportadora')
        ->and($record['export']['notice'])->toContain('no es una receta')
        ->and($record['patient']['name'])->toBe('Paciente Compartido')
        ->and($record['patient'])->not->toHaveKeys(['email', 'phone']);

    // Only this practice's two appointments, in order.
    expect(collect($record['appointments'])->pluck('professional.name')->all())->toBe(['Dra. Exportadora', 'Dr. Colega']);

    [$own, $theirs] = $record['appointments'];
    $note = $own['clinical_notes'][0];
    expect($note['author']['name'])->toBe('Dra. Exportadora')
        ->and($note['annulment'])->toBeNull()
        ->and(collect($note['versions'])->pluck('body')->all())->toBe(['Primera versión de la nota.', 'Nota enmendada.'])
        ->and($note['versions'][1]['reason'])->toBe('Faltaba un dato.')
        ->and($note['versions'][1]['author']['name'])->toBe('Dra. Exportadora')
        ->and($note['versions'][1]['diagnoses'])->toBe([['code' => 'J06.9', 'description' => 'Infección aguda de las vías respiratorias superiores']]);

    expect($own['prescriptions'])->toHaveCount(1)
        ->and($own['prescriptions'][0]['annulment'])->toBeNull()
        ->and(collect($own['prescriptions'][0]['versions'])->pluck('version')->all())->toBe([1, 2])
        ->and($own['prescriptions'][0]['versions'][1]['items'][0]['medication'])->toBe('Ibuprofeno');

    // The colleague's notes and medication are part of the history the exporter reads with the patient's code (#364).
    expect($theirs['clinical_notes'][0]['versions'][0]['body'])->toBe('Nota del colega.')
        ->and($theirs['clinical_notes'][0]['annulment']['reason'])->toBe('Paciente equivocado.')
        ->and($theirs['clinical_notes'][0]['annulment']['author']['name'])->toBe($colleague->user->name)
        ->and($theirs['prescriptions'])->toHaveCount(1)
        ->and($theirs['prescriptions'][0]['author']['name'])->toBe('Dr. Colega')
        ->and($record['export']['notice'])->toContain('los suyos y los de otros profesionales que el paciente le abrió con su código');

    expect($response->getContent())->not->toContain('Otro Consultorio')
        ->not->toContain('Nota de otro consultorio.')
        ->not->toContain('Dr. De Afuera');
});

test('without the patient\'s code the export holds only the exporter\'s own records, as the history they read', function () {
    ['exporter' => $exporter, 'patient' => $patient] = sharedPatientHistory();
    PatientAccessCode::query()->withoutGlobalScope('organization')->delete();
    [$own, $theirs] = Appointment::query()->where('organization_id', $exporter->organization_id)->where('patient_id', $patient->id)->orderBy('start_at')->get()->all();
    BloodTypeRecord::factory()->create(['appointment_id' => $theirs->id]);
    MedicalHistoryEntry::factory()->create(['appointment_id' => $theirs->id]);
    VitalSign::factory()->create(['appointment_id' => $theirs->id]);

    $response = $this->actingAs($exporter->user)->getJson("/api/v1/patients/{$patient->id}/clinical-record?format=json")->assertOk();

    [$ownAppointment, $theirAppointment] = $response->json('appointments');
    expect($ownAppointment['clinical_notes'])->toHaveCount(1)
        ->and($ownAppointment['prescriptions'])->toHaveCount(1)
        ->and($theirAppointment['clinical_notes'])->toBe([])
        ->and($theirAppointment['prescriptions'])->toBe([])
        ->and($theirAppointment['vital_signs'])->toBe([])
        ->and($response->json('blood_types'))->toBe([])
        ->and($response->json('medical_history'))->toBe([]);
    expect($response->getContent())->not->toContain('Nota del colega.');
});

test('the export carries every measurement under its appointment and the background of every author, from this practice only', function () {
    ['exporter' => $exporter, 'colleague' => $colleague, 'patient' => $patient] = sharedPatientHistory();
    [$own, $theirs] = Appointment::query()->where('organization_id', $exporter->organization_id)->where('patient_id', $patient->id)->orderBy('start_at')->get()->all();

    $measurement = VitalSign::factory()->create(['appointment_id' => $own->id]);
    $measurement->versions()->create(['version' => 2, 'membership_id' => $exporter->id, 'weight_kg' => 72, 'height_cm' => 170, 'reason' => 'Balanza mal calibrada.']);
    $annulled = VitalSign::factory()->create(['appointment_id' => $theirs->id]);
    $annulled->annulment()->create(['membership_id' => $colleague->id, 'reason' => 'Otro paciente.']);
    BloodTypeRecord::factory()->create(['appointment_id' => $theirs->id]);
    $allergy = MedicalHistoryEntry::factory()->create(['appointment_id' => $theirs->id]);
    $allergy->withdrawal()->create(['membership_id' => $colleague->id, 'reason' => 'Ya no la tiene.']);
    MedicalHistoryEntry::factory()->create(['appointment_id' => $own->id, 'category' => MedicalHistoryCategory::Family]);

    $outside = Appointment::query()->where('organization_id', '!=', $exporter->organization_id)->where('patient_id', $patient->id)->sole();
    VitalSign::factory()->create(['appointment_id' => $outside->id]);
    BloodTypeRecord::factory()->create(['appointment_id' => $outside->id, 'blood_type' => 'AB-']);

    $record = $this->actingAs($exporter->user)->getJson("/api/v1/patients/{$patient->id}/clinical-record?format=json")->assertOk()->json();

    [$ownAppointment, $theirAppointment] = $record['appointments'];
    expect($ownAppointment['vital_signs'])->toHaveCount(1)
        ->and(collect($ownAppointment['vital_signs'][0]['versions'])->pluck('values.weight_kg')->all())->toEqual([70.5, 72])
        ->and($ownAppointment['vital_signs'][0]['versions'][1]['values']['bmi'])->toEqual(24.9)
        ->and($ownAppointment['vital_signs'][0]['versions'][1]['reason'])->toBe('Balanza mal calibrada.')
        ->and($theirAppointment['vital_signs'][0]['annulment']['author']['name'])->toBe('Dr. Colega');

    expect($record['blood_types'])->toHaveCount(1)
        ->and($record['blood_types'][0]['blood_type'])->toBe('O+')
        ->and($record['blood_types'][0]['author']['name'])->toBe('Dr. Colega')
        ->and(collect($record['medical_history'])->pluck('category')->all())->toBe(['allergy', 'family'])
        ->and($record['medical_history'][0]['versions'][0]['description'])->toBe('Penicilina')
        ->and($record['medical_history'][0]['withdrawal']['reason'])->toBe('Ya no la tiene.');
});

test('annulled medication stays in the export with every version, its reason, author and date', function () {
    ['exporter' => $exporter, 'patient' => $patient] = sharedPatientHistory();
    $prescription = Prescription::query()->where('membership_id', $exporter->id)->sole();
    $prescription->annulment()->create([
        'membership_id' => $exporter->id,
        'reason' => 'Terminó el tratamiento.',
    ]);

    $response = $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=json");

    $exported = $response->assertOk()->json('appointments.0.prescriptions.0');
    expect($exported['annulment']['reason'])->toBe('Terminó el tratamiento.')
        ->and($exported['annulment']['author']['name'])->toBe('Dra. Exportadora')
        ->and($exported['annulment']['created_at'])->not->toBeNull()
        ->and(collect($exported['versions'])->pluck('version')->all())->toBe([1, 2]);
});

test('a PDF export answers the same data, and is recorded as a PDF', function () {
    ['exporter' => $exporter, 'patient' => $patient] = sharedPatientHistory();

    $response = $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=pdf");

    // The panel draws the PDF from this (ADR 0023); the API never answers one.
    $response->assertOk()
        ->assertHeader('Content-Type', 'application/json')
        ->assertHeaderMissing('Content-Disposition')
        ->assertJsonPath('patient.name', 'Paciente Compartido')
        ->assertJsonPath('appointments.0.clinical_notes.0.versions.1.body', 'Nota enmendada.');
    expect(ClinicalRecordExport::query()->withoutGlobalScope('organization')->sole()->format)
        ->toBe(ClinicalRecordExportFormat::Pdf);
});

test('a note written by a professional who was later deactivated keeps the author name in the export', function () {
    ['exporter' => $exporter, 'colleague' => $colleague, 'patient' => $patient] = sharedPatientHistory();
    $colleague->delete();

    $response = $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=json");

    $theirs = $response->assertOk()->json('appointments.1');
    expect($theirs['professional']['name'])->toBe('Dr. Colega')
        ->and($theirs['clinical_notes'][0]['author']['name'])->toBe('Dr. Colega');
});

test('each export is recorded with who, which patient and which format', function () {
    ['exporter' => $exporter, 'patient' => $patient] = sharedPatientHistory();

    $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=json")->assertOk();

    $export = ClinicalRecordExport::query()->withoutGlobalScope('organization')->sole();
    expect($export->organization_id)->toBe($exporter->organization_id)
        ->and($export->membership_id)->toBe($exporter->id)
        ->and($export->patient_id)->toBe($patient->id)
        ->and($export->scope)->toBe(ClinicalRecordExportScope::Patient)
        ->and($export->format)->toBe(ClinicalRecordExportFormat::Json);
});

test('a patient export leaves its row in the patient trail, pointing at the export', function () {
    ['exporter' => $exporter, 'patient' => $patient] = sharedPatientHistory();

    $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=pdf")->assertOk();

    $export = ClinicalRecordExport::query()->withoutGlobalScope('organization')->sole();
    $row = ClinicalAccessLog::query()->withoutGlobalScope('organization')->where('action', ClinicalAccessAction::RecordExported)->sole();
    expect($row->organization_id)->toBe($exporter->organization_id)
        ->and($row->membership_id)->toBe($exporter->id)
        ->and($row->patient_id)->toBe($patient->id)
        ->and($row->clinical_record_export_id)->toBe($export->id);
});

test('the export carries the patient trail in the practice, oldest first, as the exporter sees it', function () {
    ['exporter' => $exporter, 'colleague' => $colleague, 'patient' => $patient] = sharedPatientHistory();
    $logs = ClinicalAccessLog::query()->withoutGlobalScope('organization');
    $logs->forceCreate([
        'organization_id' => $colleague->organization_id,
        'membership_id' => $colleague->id,
        'patient_id' => $patient->id,
        'action' => ClinicalAccessAction::ExceptionalAccess,
        'reason' => ClinicalAccessReason::Other,
        'reason_detail' => 'Palabras del colega.',
        'created_at' => now()->subMinutes(10),
    ]);
    $logs->forceCreate([
        'organization_id' => $colleague->organization_id,
        'membership_id' => $colleague->id,
        'patient_id' => $patient->id,
        'action' => ClinicalAccessAction::PrescriptionIssued,
        'created_at' => now()->subMinutes(5),
    ]);

    $response = $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=json");

    $trail = collect($response->assertOk()->json('access_log'));
    // The exporter's own reason (sharedPatientHistory), the colleague's, the medication the colleague indicated
    // (#359), and this export; never the outsider's access in another practice.
    expect($trail->map(fn (array $entry) => [$entry['professional']['name'], $entry['action']])->all())->toBe([
        ['Dr. Colega', 'exceptional_access'],
        ['Dr. Colega', 'prescription_issued'],
        ['Dra. Exportadora', 'exceptional_access'],
        ['Dra. Exportadora', 'record_exported'],
    ])
        ->and($trail[0]['reason'])->toBe('other')
        ->and($trail[0])->not->toHaveKey('reason_detail')
        ->and($trail[3]['export'])->toMatchArray(['scope' => 'patient', 'format' => 'json']);
    expect($response->getContent())->not->toContain('Palabras del colega.')
        ->not->toContain('Dr. De Afuera');
});

test('a rejected export leaves nothing in the trail', function () {
    ['patient' => $patient, 'organization' => $organization] = sharedPatientHistory();
    $before = ClinicalAccessLog::query()->withoutGlobalScope('organization')->count();

    $this->actingAs(professionalIn($organization, 'Dr. Ajeno')->user)
        ->get("/api/v1/patients/{$patient->id}/clinical-record?format=json")
        ->assertForbidden();

    expect(ClinicalAccessLog::query()->withoutGlobalScope('organization')->count())->toBe($before);
});

test('only a professional who attended the patient can export, never by role', function (Closure $actor) {
    ['patient' => $patient, 'organization' => $organization] = sharedPatientHistory();

    $this->actingAs($actor($organization)->user)
        ->get("/api/v1/patients/{$patient->id}/clinical-record?format=json")
        ->assertForbidden();

    expect(ClinicalRecordExport::query()->withoutGlobalScope('organization')->count())->toBe(0);
})->with([
    'the owner' => [fn (Organization $organization) => Membership::factory()->owner()->create(['organization_id' => $organization->id])],
    'an admin' => [fn (Organization $organization) => Membership::factory()->admin()->create(['organization_id' => $organization->id])],
    'staff' => [fn (Organization $organization) => Membership::factory()->staff()->create(['organization_id' => $organization->id])],
    'a professional who never saw the patient' => [fn (Organization $organization) => professionalIn($organization, 'Dr. Ajeno')],
]);

test('the professional who saw the patient in another practice exports only that practice history', function () {
    ['patient' => $patient] = sharedPatientHistory();
    $outsider = Membership::query()->withoutGlobalScope('organization')
        ->whereHas('user', fn ($query) => $query->where('name', 'Dr. De Afuera'))->sole();

    $response = $this->actingAs($outsider->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=json");

    $response->assertOk();
    expect($response->json('export.organization'))->toBe('Otro Consultorio')
        ->and(collect($response->json('appointments'))->pluck('professional.name')->all())->toBe(['Dr. De Afuera'])
        ->and($response->json('appointments.0.clinical_notes.0.versions.0.body'))->toBe('Nota de otro consultorio.');
    expect($response->getContent())->not->toContain('Consultorio Norte')
        ->not->toContain('Nota enmendada.')
        ->not->toContain('Nota del colega.');
});

test('a guest gets 401', function () {
    $patient = Patient::factory()->create();

    $this->getJson("/api/v1/patients/{$patient->id}/clinical-record?format=json")->assertUnauthorized();
});

test('the format is required and must be pdf or json', function (?string $format) {
    ['exporter' => $exporter, 'patient' => $patient] = sharedPatientHistory();

    $query = $format === null ? '' : "?format={$format}";
    $this->actingAs($exporter->user)
        ->getJson("/api/v1/patients/{$patient->id}/clinical-record{$query}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('format');
})->with(['missing' => [null], 'unknown' => ['docx']]);

test('an expired subscription can still take its history out', function () {
    ['exporter' => $exporter, 'patient' => $patient] = sharedPatientHistory();
    Subscription::query()->where('organization_id', $exporter->organization_id)->delete();
    Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create(['organization_id' => $exporter->organization_id]);

    $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=json")->assertOk();
});

test('exports are rate limited per user', function () {
    ['exporter' => $exporter, 'patient' => $patient] = sharedPatientHistory();

    foreach (range(1, 10) as $attempt) {
        $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=json")->assertOk();
    }

    $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=json")->assertTooManyRequests();
});

test('the attended-patients export holds every patient the professional attended, complete, and no one else', function () {
    ['exporter' => $exporter, 'colleague' => $colleague, 'patient' => $shared, 'organization' => $organization] = sharedPatientHistory();
    $second = Patient::factory()->create(['name' => 'Segundo Paciente']);
    ClinicalNote::factory()->withBody('Nota del segundo paciente.')->create(['appointment_id' => appointmentWith($exporter, $second)->id]);
    $notMine = Patient::factory()->create(['name' => 'Paciente Solo Del Colega']);
    ClinicalNote::factory()->withBody('Nota ajena.')->create(['appointment_id' => appointmentWith($colleague, $notMine)->id]);

    $response = $this->actingAs($exporter->user)->get('/api/v1/clinical-record/attended-patients');

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/json; charset=utf-8')
        ->assertHeaderMissing('Content-Disposition');
    $document = json_decode($response->streamedContent(), true, flags: JSON_THROW_ON_ERROR);

    expect($document['export']['scope'])->toBe('attended_patients')
        ->and($document['export']['organization'])->toBe('Consultorio Norte')
        ->and(collect($document['patients'])->pluck('patient.id')->sort()->values()->all())->toBe(collect([$shared->id, $second->id])->sort()->values()->all());

    $sharedRecord = collect($document['patients'])->firstWhere('patient.id', $shared->id);
    expect($sharedRecord['appointments'])->toHaveCount(2)
        ->and($sharedRecord['appointments'][1]['clinical_notes'][0]['annulment']['reason'])->toBe('Paciente equivocado.')
        ->and(collect($sharedRecord['appointments'])->map(fn (array $appointment) => collect($appointment['prescriptions'])->pluck('author.name')->all())->all())
        ->toBe([['Dra. Exportadora'], ['Dr. Colega']]);

    expect($response->streamedContent())->not->toContain('Nota ajena.')
        ->not->toContain('Nota de otro consultorio.');

    $export = ClinicalRecordExport::query()->withoutGlobalScope('organization')->sole();
    expect($export->patient_id)->toBeNull()
        ->and($export->membership_id)->toBe($exporter->id)
        ->and($export->scope)->toBe(ClinicalRecordExportScope::AttendedPatients)
        ->and($export->format)->toBe(ClinicalRecordExportFormat::Json);

    // Each exported patient's trail gets the export, and says so in the document itself.
    $exported = ClinicalAccessLog::query()->withoutGlobalScope('organization')->where('action', ClinicalAccessAction::RecordExported)->get();
    expect($exported->pluck('patient_id')->sort()->values()->all())->toBe(collect([$shared->id, $second->id])->sort()->values()->all())
        ->and($exported->pluck('clinical_record_export_id')->unique()->all())->toBe([$export->id])
        ->and($exported->pluck('membership_id')->unique()->all())->toBe([$exporter->id]);
    foreach ($document['patients'] as $record) {
        expect(collect($record['access_log'])->last())->toMatchArray([
            'action' => 'record_exported',
            'export' => ['id' => $export->id, 'scope' => 'attended_patients', 'format' => 'json'],
        ]);
    }
});

test('a membership that attended no one gets an empty attended-patients export', function () {
    $owner = Membership::factory()->owner()->create();

    $response = $this->actingAs($owner->user)->get('/api/v1/clinical-record/attended-patients');

    $response->assertOk();
    expect(json_decode($response->streamedContent(), true, flags: JSON_THROW_ON_ERROR)['patients'])->toBe([]);
});
