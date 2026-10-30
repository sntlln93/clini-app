<?php

declare(strict_types=1);

use App\Enums\ClinicalAccessAction;
use App\Enums\MedicalHistoryCategory;
use App\Models\Appointment;
use App\Models\BloodTypeRecord;
use App\Models\ClinicalAccessLog;
use App\Models\MedicalHistoryEntry;
use App\Models\Membership;
use App\Models\Patient;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * Today, so the patient's history opens without a reason (#325).
 */
function backgroundAppointment(Membership $membership, array $attributes = []): Appointment
{
    return Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'start_at' => now(),
        'end_at' => now()->addMinutes(30),
        ...$attributes,
    ]);
}

test('a professional records the blood type and changes it, keeping every earlier value with its author', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = backgroundAppointment($membership);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/blood-types", ['blood_type' => 'A+'])
        ->assertCreated()
        ->assertJsonPath('data.blood_type', 'A+')
        ->assertJsonPath('data.reason', null);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/blood-types", ['blood_type' => 'A+'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'medical_history.blood_type_unchanged');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/blood-types", ['blood_type' => 'A-', 'reason' => 'Nuevo análisis.'])
        ->assertCreated();

    $this->actingAs($membership->user)
        ->getJson("/api/v1/patients/{$appointment->patient_id}/medical-history")
        ->assertOk()
        ->assertJsonPath('data.blood_types.0.blood_type', 'A-')
        ->assertJsonPath('data.blood_types.0.reason', 'Nuevo análisis.')
        ->assertJsonPath('data.blood_types.1.blood_type', 'A+')
        ->assertJsonPath('data.blood_types.1.author_name', $membership->user->name);

    expect(ClinicalAccessLog::query()->where('action', ClinicalAccessAction::BloodTypeRecorded)->count())->toBe(2);
});

test('the blood type must be a known one', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = backgroundAppointment($membership);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/blood-types", ['blood_type' => 'C+'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('blood_type');
});

test('an allergy records its substance, reaction and severity, and the write is logged', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = backgroundAppointment($membership);

    $response = $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/medical-history-entries", [
            'category' => 'allergy',
            'description' => ' Penicilina ',
            'reaction' => 'Urticaria',
            'severity' => 'severe',
            'patient_id' => Patient::factory()->create()->id,
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.category', 'allergy')
        ->assertJsonPath('data.description', 'Penicilina')
        ->assertJsonPath('data.severity', 'severe')
        ->assertJsonPath('data.withdrawal', null);

    $entry = MedicalHistoryEntry::findOrFail($response->json('data.id'));
    expect($entry->patient_id)->toBe($appointment->patient_id)
        ->and(ClinicalAccessLog::query()->where('medical_history_entry_id', $entry->id)->sole()->action)->toBe(ClinicalAccessAction::MedicalHistoryRecorded);
});

test('only an allergy carries a reaction and a severity, and only an antecedent an approximate date', function (array $payload, string $field) {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = backgroundAppointment($membership);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/medical-history-entries", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'antecedent with a reaction' => [['category' => 'personal', 'description' => 'Asma', 'reaction' => 'Tos'], 'reaction'],
    'antecedent with a severity' => [['category' => 'family', 'description' => 'Diabetes', 'severity' => 'mild'], 'severity'],
    'allergy with a date' => [['category' => 'allergy', 'description' => 'Polen', 'approximate_date' => '2010'], 'approximate_date'],
    'no description' => [['category' => 'surgical', 'description' => ''], 'description'],
    'unknown category' => [['category' => 'dental', 'description' => 'Caries'], 'category'],
    'unknown severity' => [['category' => 'allergy', 'description' => 'Polen', 'severity' => 'fatal'], 'severity'],
]);

test('an amendment adds a version, keeps the category and drops what the category does not carry', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $entry = MedicalHistoryEntry::factory()->create([
        'appointment_id' => backgroundAppointment($membership)->id,
        'category' => MedicalHistoryCategory::Surgical,
    ]);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/medical-history-entries/{$entry->id}/amendments", [
            'description' => 'Apendicectomía',
            'approximate_date' => '2015',
            'reaction' => 'No aplica',
            'reason' => 'Faltaba la fecha.',
        ])
        ->assertCreated()
        ->assertJsonPath('data.version', 2)
        ->assertJsonPath('data.category', 'surgical')
        ->assertJsonPath('data.description', 'Apendicectomía')
        ->assertJsonPath('data.approximate_date', '2015')
        ->assertJsonPath('data.reaction', null)
        ->assertJsonPath('data.versions.0.description', 'Hipertensión arterial')
        ->assertJsonPath('data.versions.1.reason', 'Faltaba la fecha.');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/medical-history-entries/{$entry->id}/amendments", ['description' => 'Apendicectomía', 'approximate_date' => '2015'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'medical_history.amendment_unchanged');
});

test('a withdrawn entry stays in the history and takes no further change', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $entry = MedicalHistoryEntry::factory()->create(['appointment_id' => backgroundAppointment($membership)->id]);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/medical-history-entries/{$entry->id}/withdrawal", [])
        ->assertCreated()
        ->assertJsonPath('data.withdrawal.reason', null)
        ->assertJsonPath('data.description', 'Penicilina');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/medical-history-entries/{$entry->id}/amendments", ['description' => 'Amoxicilina'])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'medical_history.withdrawn');
    $this->actingAs($membership->user)
        ->postJson("/api/v1/medical-history-entries/{$entry->id}/withdrawal", ['reason' => 'Otra vez.'])
        ->assertStatus(409);

    expect(ClinicalAccessLog::query()->where('action', ClinicalAccessAction::MedicalHistoryWithdrawn)->sole()->medical_history_entry_id)->toBe($entry->id);
});

test('only the author amends or withdraws an entry, and only the appointment\'s professional records on it', function () {
    $author = Membership::factory()->onPaidPlan()->professional()->create();
    $colleague = Membership::factory()->onPaidPlan()->professional()->create(['organization_id' => $author->organization_id]);
    $appointment = backgroundAppointment($author);
    $entry = MedicalHistoryEntry::factory()->create(['appointment_id' => $appointment->id]);
    backgroundAppointment($colleague, ['patient_id' => $appointment->patient_id]);

    $this->actingAs($colleague->user)
        ->postJson("/api/v1/medical-history-entries/{$entry->id}/amendments", ['description' => 'Amoxicilina'])
        ->assertForbidden();
    $this->actingAs($colleague->user)
        ->postJson("/api/v1/medical-history-entries/{$entry->id}/withdrawal", [])
        ->assertForbidden();
    $this->actingAs($colleague->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/medical-history-entries", ['category' => 'personal', 'description' => 'Asma'])
        ->assertForbidden();
    $this->actingAs($colleague->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/blood-types", ['blood_type' => 'O+'])
        ->assertForbidden();

    // Yet the colleague reads the author's entry: one clinical history (#359).
    $this->actingAs($colleague->user)
        ->getJson("/api/v1/patients/{$appointment->patient_id}/medical-history")
        ->assertOk()
        ->assertJsonPath('data.entries.0.id', $entry->id)
        ->assertJsonPath('data.entries.0.author_name', $author->user->name);
});

test('the background listing holds this practice only, logs the read and follows the access rule', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $past = backgroundAppointment($membership, ['start_at' => now()->subMonths(2), 'end_at' => now()->subMonths(2)->addMinutes(30)]);
    $patientId = $past->patient_id;
    MedicalHistoryEntry::factory()->create(['appointment_id' => $past->id]);
    $elsewhere = Appointment::factory()->create(['patient_id' => $patientId]);
    BloodTypeRecord::factory()->create(['appointment_id' => $elsewhere->id, 'blood_type' => 'AB-']);
    $foreignEntry = MedicalHistoryEntry::factory()->create(['appointment_id' => $elsewhere->id]);

    $this->actingAs($membership->user)
        ->getJson("/api/v1/patients/{$patientId}/medical-history")
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'clinical_access.reason_required');

    $this->actingAs($membership->user)
        ->getJson('/api/v1/patients/'.Patient::factory()->create()->id.'/medical-history')
        ->assertForbidden();

    openClinicalHistory($membership, $patientId);

    $this->actingAs($membership->user)
        ->getJson("/api/v1/patients/{$patientId}/medical-history")
        ->assertOk()
        ->assertJsonCount(0, 'data.blood_types')
        ->assertJsonCount(1, 'data.entries')
        ->assertJsonMissing(['id' => $foreignEntry->id]);

    expect(ClinicalAccessLog::query()->where('action', ClinicalAccessAction::MedicalHistoryViewed)->where('membership_id', $membership->id)->count())->toBe(1);
});
