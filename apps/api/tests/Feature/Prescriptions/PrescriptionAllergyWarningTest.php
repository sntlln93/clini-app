<?php

declare(strict_types=1);

use App\Enums\ClinicalAccessAction;
use App\Enums\MedicalHistoryCategory;
use App\Models\Appointment;
use App\Models\ClinicalAccessLog;
use App\Models\MedicalHistoryEntry;
use App\Models\Membership;
use App\Models\Prescription;
use App\Models\PrescriptionAllergyWarning;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * Today, so the patient's history opens without a reason (#325).
 */
function allergyWarningAppointment(Membership $membership, array $attributes = []): Appointment
{
    return Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'start_at' => now(),
        'end_at' => now()->addMinutes(30),
        ...$attributes,
    ]);
}

/**
 * A current allergy recorded on the appointment by its professional, with the substance as its latest version.
 */
function recordAllergy(Appointment $appointment, string $substance = 'Penicilina', array $attributes = []): MedicalHistoryEntry
{
    $allergy = MedicalHistoryEntry::factory()->create(['appointment_id' => $appointment->id, ...$attributes]);

    if ($substance !== 'Penicilina') {
        $allergy->versions()->create([
            'version' => 2,
            'membership_id' => $allergy->membership_id,
            'description' => $substance,
            'reaction' => 'Urticaria',
        ]);
    }

    return $allergy;
}

function allergyWarningPayload(string $medication, array $overrides = []): array
{
    return [
        'items' => [
            ['medication' => $medication, 'presentation' => null, 'dosage' => '1 cada 8 h', 'quantity' => 1],
        ],
        ...$overrides,
    ];
}

/**
 * What «Indicar igual» sends back for an allergy the warning listed: the version that matched, as it was shown.
 */
function confirmedAllergy(MedicalHistoryEntry $allergy, bool $detailShown = true): array
{
    return ['version_id' => $allergy->versions()->reorder('version', 'desc')->firstOrFail()->id, 'detail_shown' => $detailShown];
}

function allergyWarningsShown(Membership $membership): int
{
    return ClinicalAccessLog::query()
        ->withoutGlobalScope('organization')
        ->where('membership_id', $membership->id)
        ->where('action', ClinicalAccessAction::AllergyWarningShown)
        ->count();
}

function backgroundReads(Membership $membership): int
{
    return ClinicalAccessLog::query()
        ->withoutGlobalScope('organization')
        ->where('membership_id', $membership->id)
        ->where('action', ClinicalAccessAction::MedicalHistoryViewed)
        ->count();
}

test('medication matching a current allergy, ignoring case and accents, is not indicated until the warning is confirmed', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = allergyWarningAppointment($membership);
    $allergy = recordAllergy($appointment, 'Ácido Acetilsalicílico');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('ACIDO ACETILSALICILICO 100 mg'))
        ->assertConflict()
        ->assertJsonPath('error.code', 'prescriptions.allergy_warning')
        ->assertJsonPath('error.context.allergies', [[
            'id' => $allergy->id,
            'version_id' => confirmedAllergy($allergy)['version_id'],
            'description' => 'Ácido Acetilsalicílico',
            'reaction' => 'Urticaria',
            'severity' => null,
        ]])
        ->assertJsonPath('error.context.hidden_allergy_version_ids', [])
        ->assertJsonPath('error.context.reason_required', false);

    expect(Prescription::query()->withoutGlobalScope('organization')->count())->toBe(0)
        ->and(allergyWarningsShown($membership))->toBe(1)
        ->and(ClinicalAccessLog::query()->where('action', ClinicalAccessAction::AllergyWarningShown)->sole()->appointment_id)->toBe($appointment->id);
});

test('an allergy also matches the presentation of what is indicated', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = allergyWarningAppointment($membership);
    recordAllergy($appointment);

    $payload = allergyWarningPayload('Benzetacil');
    $payload['items'][0]['presentation'] = 'Bencilpenicilina 1.200.000 UI';

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", $payload)
        ->assertConflict()
        ->assertJsonPath('error.code', 'prescriptions.allergy_warning');
});

test('withdrawn allergies, antecedents and medication that matches nothing are indicated without a warning', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = allergyWarningAppointment($membership);
    $withdrawn = recordAllergy($appointment, 'Ibuprofeno');
    $withdrawn->withdrawal()->create(['membership_id' => $membership->id, 'reason' => 'Ya no la tiene.']);
    $antecedent = MedicalHistoryEntry::factory()->create(['appointment_id' => $appointment->id, 'category' => MedicalHistoryCategory::Personal]);
    $antecedent->versions()->create(['version' => 2, 'membership_id' => $membership->id, 'description' => 'Ibuprofeno']);
    recordAllergy($appointment);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('Ibuprofeno'))
        ->assertCreated()
        ->assertJsonPath('data.allergy_warning_overridden', false);

    expect(PrescriptionAllergyWarning::query()->count())->toBe(0)
        ->and(ClinicalAccessLog::query()->withoutGlobalScope('organization')->where('action', ClinicalAccessAction::AllergyWarningOverridden)->count())->toBe(0);
});

test('«Indicar igual» indicates it, logs the confirmation and keeps on the version the allergies it was warned about', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = allergyWarningAppointment($membership);
    $allergy = recordAllergy($appointment, 'Amoxicilina');

    $response = $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('Amoxicilina', [
            'confirmed_allergies' => [confirmedAllergy($allergy)],
        ]))
        ->assertCreated()
        ->assertJsonPath('data.allergy_warning_overridden', true)
        ->assertJsonPath('data.versions.0.allergy_warning_overridden', true);

    $prescription = Prescription::findOrFail($response->json('data.id'));
    $log = ClinicalAccessLog::query()->where('action', ClinicalAccessAction::AllergyWarningOverridden)->sole();
    $warning = PrescriptionAllergyWarning::query()->sole();

    expect($log->prescription_id)->toBe($prescription->id)
        ->and($log->appointment_id)->toBe($appointment->id)
        ->and($log->membership_id)->toBe($membership->id)
        ->and($log->patient_id)->toBe($appointment->patient_id)
        ->and($warning->clinical_access_log_id)->toBe($log->id)
        ->and($warning->prescription_version_id)->toBe($prescription->versions()->sole()->id)
        ->and($warning->medical_history_entry_id)->toBe($allergy->id)
        // The version of the allergy that matched, not the first one.
        ->and($warning->medical_history_entry_version_id)->toBe($allergy->versions()->where('version', 2)->sole()->id)
        ->and($warning->detail_shown)->toBeTrue();
    // Indicating it still leaves its own row.
    expect(ClinicalAccessLog::query()->where('action', ClinicalAccessAction::PrescriptionIssued)->sole()->prescription_id)->toBe($prescription->id);
});

test('a confirmation that leaves a matching allergy out is warned again', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = allergyWarningAppointment($membership);
    $confirmed = recordAllergy($appointment);
    $missed = recordAllergy($appointment, 'Penicilina G');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('Penicilina G benzatínica', [
            'confirmed_allergies' => [confirmedAllergy($confirmed)],
        ]))
        ->assertConflict()
        ->assertJsonPath('error.context.allergies.*.id', [$confirmed->id, $missed->id]);

    expect(Prescription::query()->withoutGlobalScope('organization')->count())->toBe(0);
});

test('another author\'s allergy warns without its detail until the patient shares their code', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $colleague = Membership::factory()->professional()->create(['organization_id' => $membership->organization_id]);
    $appointment = allergyWarningAppointment($membership);
    $theirs = recordAllergy(allergyWarningAppointment($colleague, ['patient_id' => $appointment->patient_id]));

    $response = $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('Penicilina'))
        ->assertConflict()
        ->assertJsonPath('error.context.allergies', [])
        ->assertJsonPath('error.context.hidden_allergy_version_ids', [confirmedAllergy($theirs)['version_id']])
        ->assertJsonPath('error.context.reason_required', false);

    expect($response->getContent())->not->toContain('Penicilina')->not->toContain('Urticaria')
        // Even without the detail, the warning leaves its row: trying substances never goes unseen.
        ->and(allergyWarningsShown($membership))->toBe(1);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('Penicilina', [
            'confirmed_allergies' => [confirmedAllergy($theirs, detailShown: false)],
        ]))
        ->assertCreated();
    expect(PrescriptionAllergyWarning::query()->sole()->detail_shown)->toBeFalse();

    shareAccessCode($membership, $appointment->patient_id, $appointment);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('Penicilina'))
        ->assertConflict()
        ->assertJsonPath('error.context.allergies.0.description', 'Penicilina')
        ->assertJsonPath('error.context.hidden_allergy_version_ids', []);
});

test('without an appointment near today the warning withholds even one\'s own allergy, as the history would', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = allergyWarningAppointment($membership, ['start_at' => now()->subDays(30), 'end_at' => now()->subDays(30)->addMinutes(30)]);
    $allergy = recordAllergy($appointment);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('Penicilina'))
        ->assertConflict()
        ->assertJsonPath('error.context.allergies', [])
        ->assertJsonPath('error.context.hidden_allergy_version_ids', [confirmedAllergy($allergy)['version_id']])
        ->assertJsonPath('error.context.reason_required', true);

    openClinicalHistory($membership, $appointment->patient_id);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('Penicilina'))
        ->assertConflict()
        ->assertJsonPath('error.context.allergies.0.id', $allergy->id)
        ->assertJsonPath('error.context.reason_required', false);
});

test('an amendment is checked like a new record, and only its new version keeps the confirmation', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = allergyWarningAppointment($membership);
    $prescription = Prescription::factory()->create(['appointment_id' => $appointment->id]);
    $allergy = recordAllergy($appointment, 'Diclofenac');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", allergyWarningPayload('Diclofenac 75 mg'))
        ->assertConflict()
        ->assertJsonPath('error.code', 'prescriptions.allergy_warning');
    expect($prescription->versions()->count())->toBe(1);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/prescriptions/{$prescription->id}/amendments", allergyWarningPayload('Diclofenac 75 mg', [
            'confirmed_allergies' => [confirmedAllergy($allergy)],
        ]))
        ->assertCreated()
        ->assertJsonPath('data.allergy_warning_overridden', true)
        ->assertJsonPath('data.versions.0.allergy_warning_overridden', false)
        ->assertJsonPath('data.versions.1.allergy_warning_overridden', true);

    expect(PrescriptionAllergyWarning::query()->sole()->prescription_version_id)
        ->toBe($prescription->versions()->where('version', 2)->sole()->id);
});

test('a confirmation of an earlier version of the allergy is warned again with the current one', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = allergyWarningAppointment($membership);
    $allergy = recordAllergy($appointment);
    $shown = confirmedAllergy($allergy);
    $allergy->versions()->create(['version' => 2, 'membership_id' => $membership->id, 'description' => 'Penicilina', 'reaction' => 'Anafilaxia']);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('Penicilina', [
            'confirmed_allergies' => [$shown],
        ]))
        ->assertConflict()
        ->assertJsonPath('error.context.allergies.0.reaction', 'Anafilaxia');

    expect(PrescriptionAllergyWarning::query()->count())->toBe(0);
});

test('a hidden allergy confirmed without its detail is warned again once its detail can be shown', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $colleague = Membership::factory()->professional()->create(['organization_id' => $membership->organization_id]);
    $appointment = allergyWarningAppointment($membership);
    $theirs = recordAllergy(allergyWarningAppointment($colleague, ['patient_id' => $appointment->patient_id]));
    shareAccessCode($membership, $appointment->patient_id, $appointment);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('Penicilina', [
            'confirmed_allergies' => [confirmedAllergy($theirs, detailShown: false)],
        ]))
        ->assertConflict()
        ->assertJsonPath('error.context.allergies.0.description', 'Penicilina');

    expect(PrescriptionAllergyWarning::query()->count())->toBe(0);
});

test('an amendment that can\'t succeed says why before any allergy warning', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = allergyWarningAppointment($membership);
    recordAllergy($appointment);
    $annulled = Prescription::factory()->create(['appointment_id' => $appointment->id]);
    $annulled->annulment()->create(['membership_id' => $membership->id, 'reason' => 'Terminó el tratamiento.']);
    $unchanged = Prescription::factory()->create(['appointment_id' => $appointment->id]);
    $item = $unchanged->versions()->sole()->items()->sole();
    recordAllergy($appointment, $item->medication);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/prescriptions/{$annulled->id}/amendments", allergyWarningPayload('Penicilina'))
        ->assertConflict()
        ->assertJsonPath('error.code', 'prescriptions.annulled');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/prescriptions/{$unchanged->id}/amendments", ['items' => [[
            'medication' => $item->medication,
            'presentation' => $item->presentation,
            'dosage' => $item->dosage,
            'quantity' => $item->quantity,
        ]]])
        ->assertConflict()
        ->assertJsonPath('error.code', 'prescriptions.amendment_unchanged');

    expect(allergyWarningsShown($membership))->toBe(0);
});

test('the confirmed allergies must be version ids, each saying whether it was shown', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = allergyWarningAppointment($membership);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('Amoxicilina', [
            'confirmed_allergies' => [['version_id' => 'penicilina']],
        ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['confirmed_allergies.0.version_id', 'confirmed_allergies.0.detail_shown']);
});

test('the export says which version was indicated despite an allergy warning, and its trail the confirmation', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = allergyWarningAppointment($membership);
    $allergy = recordAllergy($appointment);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/prescriptions", allergyWarningPayload('Penicilina', [
            'confirmed_allergies' => [confirmedAllergy($allergy)],
        ]))
        ->assertCreated();

    $record = $this->actingAs($membership->user)
        ->getJson("/api/v1/patients/{$appointment->patient_id}/clinical-record?format=json")
        ->assertOk()
        ->assertJsonPath('appointments.0.prescriptions.0.versions.0.allergy_warning_overridden', true)
        ->json();

    expect(collect($record['access_log'])->pluck('action'))->toContain(ClinicalAccessAction::AllergyWarningOverridden->value);
});

test('the form lists the current allergies the appointment\'s professional reads, and logs the read', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $colleague = Membership::factory()->professional()->create(['organization_id' => $membership->organization_id]);
    $appointment = allergyWarningAppointment($membership);
    $current = recordAllergy($appointment, 'Látex');
    recordAllergy($appointment, 'Ibuprofeno')->withdrawal()->create(['membership_id' => $membership->id, 'reason' => null]);
    MedicalHistoryEntry::factory()->create(['appointment_id' => $appointment->id, 'category' => MedicalHistoryCategory::Surgical]);
    recordAllergy(allergyWarningAppointment($colleague, ['patient_id' => $appointment->patient_id]), 'Yodo');

    $response = $this->actingAs($membership->user)
        ->getJson("/api/v1/appointments/{$appointment->id}/allergies")
        ->assertOk()
        ->assertJsonPath('data.*.id', [$current->id])
        ->assertJsonPath('data.0.description', 'Látex');

    expect($response->getContent())->not->toContain('Yodo')
        ->and(backgroundReads($membership))->toBe(1);
});

test('only the appointment\'s professional lists its allergies, and not without an appointment near today', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $colleague = Membership::factory()->professional()->create(['organization_id' => $membership->organization_id]);
    $appointment = allergyWarningAppointment($membership);
    $past = allergyWarningAppointment($colleague, ['start_at' => now()->subDays(30), 'end_at' => now()->subDays(30)->addMinutes(30)]);
    recordAllergy($past);

    $this->actingAs($colleague->user)->getJson("/api/v1/appointments/{$appointment->id}/allergies")->assertForbidden();
    $this->actingAs($colleague->user)
        ->getJson("/api/v1/appointments/{$past->id}/allergies")
        ->assertConflict()
        ->assertJsonPath('error.code', 'clinical_access.reason_required');

    expect(backgroundReads($colleague))->toBe(0);
});
