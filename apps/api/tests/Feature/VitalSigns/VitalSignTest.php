<?php

declare(strict_types=1);

use App\Enums\ClinicalAccessAction;
use App\Enums\SubscriptionStatus;
use App\Models\Appointment;
use App\Models\ClinicalAccessLog;
use App\Models\Membership;
use App\Models\Patient;
use App\Models\Subscription;
use App\Models\VitalSign;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * Today, so the patient's history opens without a reason (#325).
 */
function measuringAppointment(Membership $membership, array $attributes = []): Appointment
{
    return Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'start_at' => now(),
        'end_at' => now()->addMinutes(30),
        ...$attributes,
    ]);
}

function measurementPayload(array $overrides = []): array
{
    return [
        'weight_kg' => 80.25,
        'height_cm' => 180,
        'systolic_mmhg' => 120,
        'diastolic_mmhg' => 80,
        'temperature_c' => 36.5,
        ...$overrides,
    ];
}

test('a professional records a measurement on an own appointment, with the BMI computed and the write logged', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = measuringAppointment($membership);

    $response = $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/vital-signs", measurementPayload([
            'patient_id' => Patient::factory()->create()->id,
            'membership_id' => Membership::factory()->create()->id,
        ]));

    $response->assertCreated()
        ->assertJsonPath('data.version', 1)
        ->assertJsonPath('data.values.weight_kg', 80.25)
        ->assertJsonPath('data.values.height_cm', 180)
        ->assertJsonPath('data.values.bmi', 24.8)
        ->assertJsonPath('data.values.heart_rate_bpm', null)
        ->assertJsonPath('data.annulment', null);

    // The patient comes from the appointment, never from the request (#360).
    $vitalSign = VitalSign::findOrFail($response->json('data.id'));
    expect($vitalSign->patient_id)->toBe($appointment->patient_id)
        ->and($vitalSign->membership_id)->toBe($membership->id)
        ->and(ClinicalAccessLog::query()->where('vital_sign_id', $vitalSign->id)->sole()->action)->toBe(ClinicalAccessAction::VitalSignRecorded);
});

test('a measurement holds at least one value, each within a plausible range', function (array $payload, string $field) {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $appointment = measuringAppointment($membership);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/vital-signs", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'nothing' => [[], 'values'],
    'only nulls' => [['weight_kg' => null, 'heart_rate_bpm' => null], 'values'],
    'weight out of range' => [['weight_kg' => 900], 'weight_kg'],
    'too many decimals' => [['temperature_c' => 36.55], 'temperature_c'],
    'saturation over 100' => [['oxygen_saturation_pct' => 101], 'oxygen_saturation_pct'],
    'systolic without diastolic' => [['systolic_mmhg' => 120], 'diastolic_mmhg'],
    'diastolic above systolic' => [['systolic_mmhg' => 80, 'diastolic_mmhg' => 120], 'diastolic_mmhg'],
]);

test('only the professional of the appointment records on it', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $colleague = Membership::factory()->onPaidPlan()->professional()->create(['organization_id' => $membership->organization_id]);
    $appointment = measuringAppointment($colleague);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/vital-signs", measurementPayload())
        ->assertForbidden();

    expect(VitalSign::query()->withoutGlobalScopes()->count())->toBe(0);
});

test('an amendment corrects the same measurement with a new version instead of adding a point', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $vitalSign = VitalSign::factory()->create(['appointment_id' => measuringAppointment($membership)->id]);
    $measuredAt = $vitalSign->measured_at;

    $this->actingAs($membership->user)
        ->postJson("/api/v1/vital-signs/{$vitalSign->id}/amendments", ['weight_kg' => 75.5, 'height_cm' => 170, 'reason' => 'Error de tipeo.'])
        ->assertCreated()
        ->assertJsonPath('data.version', 2)
        ->assertJsonPath('data.values.weight_kg', 75.5)
        ->assertJsonPath('data.versions.0.values.weight_kg', 70.5)
        ->assertJsonPath('data.versions.1.reason', 'Error de tipeo.');

    expect(VitalSign::query()->count())->toBe(1)
        ->and($vitalSign->fresh()?->measured_at?->equalTo($measuredAt))->toBeTrue()
        ->and(ClinicalAccessLog::query()->where('action', ClinicalAccessAction::VitalSignAmended)->sole()->vital_sign_id)->toBe($vitalSign->id);
});

test('an amendment that repeats the current values is refused', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $vitalSign = VitalSign::factory()->create(['appointment_id' => measuringAppointment($membership)->id]);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/vital-signs/{$vitalSign->id}/amendments", ['weight_kg' => 70.5, 'height_cm' => 170])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'vital_signs.amendment_unchanged');
});

test('annulling takes a reason, keeps every version and leaves no further amendment', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $vitalSign = VitalSign::factory()->create(['appointment_id' => measuringAppointment($membership)->id]);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/vital-signs/{$vitalSign->id}/annulment", ['reason' => ''])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('reason');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/vital-signs/{$vitalSign->id}/annulment", ['reason' => 'Era de otro paciente.'])
        ->assertCreated()
        ->assertJsonPath('data.annulment.reason', 'Era de otro paciente.')
        ->assertJsonCount(1, 'data.versions');

    $this->actingAs($membership->user)
        ->postJson("/api/v1/vital-signs/{$vitalSign->id}/amendments", ['weight_kg' => 71])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'vital_signs.annulled');
    $this->actingAs($membership->user)
        ->postJson("/api/v1/vital-signs/{$vitalSign->id}/annulment", ['reason' => 'Otra vez.'])
        ->assertStatus(409);
});

test('reading the history does not let a colleague amend or annul a measurement', function () {
    $author = Membership::factory()->onPaidPlan()->professional()->create();
    $colleague = Membership::factory()->onPaidPlan()->professional()->create(['organization_id' => $author->organization_id]);
    $vitalSign = VitalSign::factory()->create(['appointment_id' => measuringAppointment($author)->id]);
    measuringAppointment($colleague, ['patient_id' => $vitalSign->patient_id]);

    $this->actingAs($colleague->user)
        ->postJson("/api/v1/vital-signs/{$vitalSign->id}/amendments", ['weight_kg' => 71])
        ->assertForbidden();
    $this->actingAs($colleague->user)
        ->postJson("/api/v1/vital-signs/{$vitalSign->id}/annulment", ['reason' => 'No corresponde.'])
        ->assertForbidden();
});

test('a measurement of another practice is forbidden', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $elsewhere = VitalSign::factory()->create();

    $this->actingAs($membership->user)
        ->postJson("/api/v1/vital-signs/{$elsewhere->id}/amendments", ['weight_kg' => 71])
        ->assertForbidden();
});

test('the patient listing holds every author\'s measurements of the practice once the patient\'s code is redeemed, newest first, and logs the read', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $colleague = Membership::factory()->onPaidPlan()->professional()->create(['organization_id' => $membership->organization_id]);
    $own = measuringAppointment($membership);
    $patient = $own->patient;
    $older = VitalSign::factory()->create(['appointment_id' => measuringAppointment($colleague, ['patient_id' => $patient->id])->id, 'measured_at' => now()->subMonth()]);
    $newer = VitalSign::factory()->create(['appointment_id' => $own->id]);
    $elsewhere = VitalSign::factory()->create(['appointment_id' => Appointment::factory()->create(['patient_id' => $patient->id])->id]);

    $this->actingAs($membership->user)
        ->getJson("/api/v1/patients/{$patient->id}/vital-signs")
        ->assertOk()
        ->assertJsonPath('data.*.id', [$newer->id]);

    shareAccessCode($membership, $patient->id);

    $this->actingAs($membership->user)
        ->getJson("/api/v1/patients/{$patient->id}/vital-signs")
        ->assertOk()
        ->assertJsonPath('data.0.id', $newer->id)
        ->assertJsonPath('data.1.id', $older->id)
        ->assertJsonPath('data.1.author_name', $colleague->user->name)
        ->assertJsonMissing(['id' => $elsewhere->id])
        ->assertJsonCount(2, 'data');

    expect(ClinicalAccessLog::query()->where('action', ClinicalAccessAction::VitalSignsViewed)->sole()->patient_id)->toBe($patient->id);
});

test('without an appointment near today the listing asks for a reason, and without any it is forbidden', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    $past = measuringAppointment($membership, ['start_at' => now()->subMonths(2), 'end_at' => now()->subMonths(2)->addMinutes(30)]);
    $stranger = Patient::factory()->create();

    $this->actingAs($membership->user)
        ->getJson("/api/v1/patients/{$past->patient_id}/vital-signs")
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'clinical_access.reason_required');

    $this->actingAs($membership->user)
        ->getJson("/api/v1/patients/{$stranger->id}/vital-signs")
        ->assertForbidden();

    openClinicalHistory($membership, $past->patient_id);

    $this->actingAs($membership->user)
        ->getJson("/api/v1/patients/{$past->patient_id}/vital-signs")
        ->assertOk();
});

test('an expired subscription keeps the measurements readable but not writable', function () {
    $membership = Membership::factory()->onPaidPlan()->professional()->create();
    Subscription::query()->where('organization_id', $membership->organization_id)->delete();
    Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create(['organization_id' => $membership->organization_id]);
    $appointment = measuringAppointment($membership);

    $this->actingAs($membership->user)
        ->postJson("/api/v1/appointments/{$appointment->id}/vital-signs", measurementPayload())
        ->assertStatus(409);
    $this->actingAs($membership->user)
        ->getJson("/api/v1/patients/{$appointment->patient_id}/vital-signs")
        ->assertOk();
});
