<?php

declare(strict_types=1);

use App\Contracts\PdfRenderer;
use App\Enums\ClinicalRecordExportFormat;
use App\Enums\ClinicalRecordExportScope;
use App\Enums\SubscriptionStatus;
use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\ClinicalRecordExport;
use App\Models\Icd10Code;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Subscription;
use App\Support\ClinicalNoteDiagnoses;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * Hands back the HTML instead of rendering it, so a test can read what the PDF says.
 */
function fakePdfRenderer(): void
{
    app()->instance(PdfRenderer::class, new class implements PdfRenderer
    {
        public function render(string $html): string
        {
            return $html;
        }
    });
}

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

    // Every appointment is weeks before today, so the history opens as an exceptional access would (#325).
    openClinicalHistory($exporter, $patient->id);
    openClinicalHistory($outsider, $patient->id);

    return ['exporter' => $exporter, 'colleague' => $colleague, 'patient' => $patient, 'organization' => $organization];
}

test('the attending professional exports the patient history as JSON with every act, its author and its versions', function () {
    ['exporter' => $exporter, 'colleague' => $colleague, 'patient' => $patient] = sharedPatientHistory();

    $response = $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=json");

    $response->assertOk()
        ->assertHeader('Content-Disposition', "attachment; filename=\"historia-clinica-{$patient->id}.json\"")
        ->assertHeader('X-Content-Type-Options', 'nosniff');
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
        ->and(collect($own['prescriptions'][0]['versions'])->pluck('version')->all())->toBe([1, 2])
        ->and($own['prescriptions'][0]['versions'][1]['items'][0]['medication'])->toBe('Ibuprofeno');

    // The colleague's notes are part of the history the exporter already reads; their medication is not (CU-53).
    expect($theirs['clinical_notes'][0]['versions'][0]['body'])->toBe('Nota del colega.')
        ->and($theirs['clinical_notes'][0]['annulment']['reason'])->toBe('Paciente equivocado.')
        ->and($theirs['clinical_notes'][0]['annulment']['author']['name'])->toBe($colleague->user->name)
        ->and($theirs['prescriptions'])->toBe([]);

    expect($response->getContent())->not->toContain('Otro Consultorio')
        ->not->toContain('Nota de otro consultorio.')
        ->not->toContain('Dr. De Afuera');
});

test('the PDF says the same, in the practice time zone, and nothing from another practice', function () {
    fakePdfRenderer();
    ['exporter' => $exporter, 'patient' => $patient] = sharedPatientHistory();

    $response = $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=pdf");

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/pdf')
        ->assertHeader('Content-Disposition', "attachment; filename=\"historia-clinica-{$patient->id}.pdf\"");

    $html = (string) $response->getContent();
    expect($html)->toContain('Paciente Compartido')
        ->toContain('Consultorio Norte')
        ->toContain('Primera versión de la nota.')
        ->toContain('Enmienda (versión 2), Dra. Exportadora')
        ->toContain('Motivo: Faltaba un dato.')
        ->toContain('J06.9')
        ->toContain('Anulada el')
        ->toContain('Motivo: Paciente equivocado.')
        ->toContain('Ibuprofeno')
        ->toContain('Este documento no es una receta.')
        // 13:00 UTC is 10:00 in Buenos Aires.
        ->toContain('01/09/2026 10:00')
        ->not->toContain('Nota de otro consultorio.')
        ->not->toContain('Otro Consultorio');
});

test('the PDF renderer produces a real PDF', function () {
    ['exporter' => $exporter, 'patient' => $patient] = sharedPatientHistory();

    $response = $this->actingAs($exporter->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=pdf");

    $response->assertOk();
    expect(substr((string) $response->getContent(), 0, 5))->toBe('%PDF-');
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
        ->assertHeader('Content-Disposition', 'attachment; filename=historia-clinica.json');
    $document = json_decode($response->streamedContent(), true, flags: JSON_THROW_ON_ERROR);

    expect($document['export']['scope'])->toBe('attended_patients')
        ->and($document['export']['organization'])->toBe('Consultorio Norte')
        ->and(collect($document['patients'])->pluck('patient.id')->sort()->values()->all())->toBe(collect([$shared->id, $second->id])->sort()->values()->all());

    $sharedRecord = collect($document['patients'])->firstWhere('patient.id', $shared->id);
    expect($sharedRecord['appointments'])->toHaveCount(2)
        ->and($sharedRecord['appointments'][1]['clinical_notes'][0]['annulment']['reason'])->toBe('Paciente equivocado.');

    expect($response->streamedContent())->not->toContain('Nota ajena.')
        ->not->toContain('Nota de otro consultorio.');

    $export = ClinicalRecordExport::query()->withoutGlobalScope('organization')->sole();
    expect($export->patient_id)->toBeNull()
        ->and($export->membership_id)->toBe($exporter->id)
        ->and($export->scope)->toBe(ClinicalRecordExportScope::AttendedPatients)
        ->and($export->format)->toBe(ClinicalRecordExportFormat::Json);
});

test('a membership that attended no one gets an empty attended-patients export', function () {
    $owner = Membership::factory()->owner()->create();

    $response = $this->actingAs($owner->user)->get('/api/v1/clinical-record/attended-patients');

    $response->assertOk();
    expect(json_decode($response->streamedContent(), true, flags: JSON_THROW_ON_ERROR)['patients'])->toBe([]);
});
