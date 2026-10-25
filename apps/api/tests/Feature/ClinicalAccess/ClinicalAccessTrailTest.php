<?php

declare(strict_types=1);

use App\Enums\ClinicalAccessAction;
use App\Enums\ClinicalAccessReason;
use App\Enums\ErrorCode;
use App\Enums\SubscriptionStatus;
use App\Models\Appointment;
use App\Models\ClinicalAccessLog;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Subscription;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * A patient seen this week by one professional and weeks ago by a colleague, in a practice on a paid plan.
 *
 * @return array{organization: Organization, reader: Membership, colleague: Membership, patient: Patient, appointment: Appointment}
 */
function trailFixture(): array
{
    $organization = Organization::factory()->center()->create();
    $reader = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $reader->user->update(['name' => 'Dra. Lectora']);
    $colleague = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $colleague->user->update(['name' => 'Dr. Colega']);
    $patient = Patient::factory()->create(['name' => 'Paciente del Rastro']);
    $patient->organizations()->attach($organization->id);

    $appointment = trailAppointment($reader, $patient, now()->subDays(2)->toDateTimeString());
    trailAppointment($colleague, $patient, now()->subDays(40)->toDateTimeString());

    return ['organization' => $organization, 'reader' => $reader, 'colleague' => $colleague, 'patient' => $patient, 'appointment' => $appointment];
}

function trailAppointment(Membership $membership, Patient $patient, string $startAt): Appointment
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
 * @param  array<string, mixed>  $attributes
 */
function trailRow(Membership $membership, Patient $patient, ClinicalAccessAction $action, string $at, array $attributes = []): ClinicalAccessLog
{
    return ClinicalAccessLog::query()->withoutGlobalScope('organization')->forceCreate([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'action' => $action,
        'created_at' => $at,
        ...$attributes,
    ]);
}

function trailUri(Patient $patient): string
{
    return "/api/v1/patients/{$patient->id}/clinical-access-logs";
}

test('whoever reads the history sees its trail, newest first, with who, what, when and the listed reason, never their words', function () {
    ['reader' => $reader, 'colleague' => $colleague, 'patient' => $patient, 'appointment' => $appointment] = trailFixture();
    trailRow($colleague, $patient, ClinicalAccessAction::ExceptionalAccess, '2026-10-01 12:00:00', [
        'reason' => ClinicalAccessReason::Other,
        'reason_detail' => 'Interconsulta por dolor torácico.',
    ]);
    trailRow($colleague, $patient, ClinicalAccessAction::NotesViewed, '2026-10-01 12:01:00');
    trailRow($reader, $patient, ClinicalAccessAction::NoteWritten, '2026-10-02 09:00:00', ['appointment_id' => $appointment->id]);

    $response = $this->actingAs($reader->user)->getJson(trailUri($patient));

    $response->assertOk();
    expect(collect($response->json('data'))->pluck('action')->all())->toBe(['note_written', 'notes_viewed', 'exceptional_access'])
        ->and(collect($response->json('data'))->pluck('professional.name')->all())->toBe(['Dra. Lectora', 'Dr. Colega', 'Dr. Colega'])
        ->and($response->json('data.0.appointment.id'))->toBe($appointment->id)
        ->and($response->json('data.1.appointment'))->toBeNull()
        ->and($response->json('data.2.reason'))->toBe('other')
        ->and($response->json('data.2'))->not->toHaveKey('reason_detail');
    expect($response->getContent())->not->toContain('Interconsulta por dolor torácico.');
});

test('what another professional did with their own medication stays theirs, while their notes are part of the trail', function () {
    ['reader' => $reader, 'colleague' => $colleague, 'patient' => $patient] = trailFixture();
    trailRow($colleague, $patient, ClinicalAccessAction::PrescriptionIssued, '2026-10-01 12:00:00');
    trailRow($colleague, $patient, ClinicalAccessAction::PrescriptionAmended, '2026-10-01 12:01:00');
    trailRow($colleague, $patient, ClinicalAccessAction::PrescriptionsViewed, '2026-10-01 12:02:00');
    trailRow($colleague, $patient, ClinicalAccessAction::NoteAmended, '2026-10-01 12:03:00');
    trailRow($colleague, $patient, ClinicalAccessAction::PrescriptionAnnulled, '2026-10-01 12:04:00');
    trailRow($reader, $patient, ClinicalAccessAction::PrescriptionIssued, '2026-10-02 09:00:00');
    trailRow($reader, $patient, ClinicalAccessAction::PrescriptionsViewed, '2026-10-02 09:01:00');
    trailRow($reader, $patient, ClinicalAccessAction::PrescriptionAnnulled, '2026-10-02 09:02:00');

    $response = $this->actingAs($reader->user)->getJson(trailUri($patient));

    expect(collect($response->assertOk()->json('data'))->map(fn (array $entry) => [$entry['professional']['name'], $entry['action']])->all())->toBe([
        ['Dra. Lectora', 'prescription_annulled'],
        ['Dra. Lectora', 'prescriptions_viewed'],
        ['Dra. Lectora', 'prescription_issued'],
        ['Dr. Colega', 'note_amended'],
    ]);
});

test('the trail holds only this practice, and only this patient', function () {
    ['reader' => $reader, 'patient' => $patient] = trailFixture();
    $elsewhere = Membership::factory()->professional()->create();
    trailRow($elsewhere, $patient, ClinicalAccessAction::NotesViewed, '2026-10-01 12:00:00');
    $otherPatient = Patient::factory()->create();
    trailRow($reader, $otherPatient, ClinicalAccessAction::NotesViewed, '2026-10-01 12:00:00');
    trailRow($reader, $patient, ClinicalAccessAction::NotesViewed, '2026-10-02 12:00:00');

    $response = $this->actingAs($reader->user)->getJson(trailUri($patient));

    expect($response->assertOk()->json('data'))->toHaveCount(1)
        ->and($response->json('data.0.professional.membership_id'))->toBe($reader->id);
});

test('an export in the trail says its scope and format', function () {
    ['reader' => $reader, 'patient' => $patient] = trailFixture();

    $this->actingAs($reader->user)->get("/api/v1/patients/{$patient->id}/clinical-record?format=pdf")->assertOk();
    $response = $this->actingAs($reader->user)->getJson(trailUri($patient));

    $export = collect($response->assertOk()->json('data'))->firstWhere('action', 'record_exported');
    expect($export['export'])->toMatchArray(['scope' => 'patient', 'format' => 'pdf'])
        ->and($export['professional']['name'])->toBe('Dra. Lectora');
});

test('the trail opens to whoever reads the history, never by role', function (Closure $actor) {
    ['patient' => $patient, 'organization' => $organization] = trailFixture();

    $this->actingAs($actor($organization)->user)->getJson(trailUri($patient))->assertForbidden();
})->with([
    'the owner' => [fn (Organization $organization) => Membership::factory()->owner()->create(['organization_id' => $organization->id])],
    'an admin' => [fn (Organization $organization) => Membership::factory()->admin()->create(['organization_id' => $organization->id])],
    'staff' => [fn (Organization $organization) => Membership::factory()->staff()->create(['organization_id' => $organization->id])],
    'a professional who never saw the patient' => [fn (Organization $organization) => Membership::factory()->professional()->create(['organization_id' => $organization->id])],
]);

test('without an appointment near today the trail takes the same reason as the history', function () {
    ['colleague' => $colleague, 'patient' => $patient] = trailFixture();

    $this->actingAs($colleague->user)->getJson(trailUri($patient))
        ->assertConflict()
        ->assertJsonPath('error.code', ErrorCode::ClinicalAccessReasonRequired->value);

    $this->actingAs($colleague->user)
        ->postJson("/api/v1/patients/{$patient->id}/exceptional-accesses", ['reason' => 'study_result'])
        ->assertCreated();

    $this->actingAs($colleague->user)->getJson(trailUri($patient))
        ->assertOk()
        ->assertJsonPath('data.0.action', 'exceptional_access')
        ->assertJsonPath('data.0.reason', 'study_result');
});

test('reading the trail leaves no row', function () {
    ['reader' => $reader, 'patient' => $patient] = trailFixture();

    $this->actingAs($reader->user)->getJson(trailUri($patient))->assertOk();
    $this->actingAs($reader->user)->getJson(trailUri($patient))->assertOk();

    expect(ClinicalAccessLog::query()->withoutGlobalScope('organization')->count())->toBe(0);
});

test('the trail comes ten rows a page', function () {
    ['reader' => $reader, 'patient' => $patient] = trailFixture();
    foreach (range(1, 12) as $minute) {
        trailRow($reader, $patient, ClinicalAccessAction::NotesViewed, sprintf('2026-10-01 12:%02d:00', $minute));
    }

    $this->actingAs($reader->user)->getJson(trailUri($patient).'?page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 12)
        ->assertJsonPath('meta.last_page', 2);
});

test('the trail keeps who accessed after their membership is deactivated', function () {
    ['reader' => $reader, 'colleague' => $colleague, 'patient' => $patient] = trailFixture();
    trailRow($colleague, $patient, ClinicalAccessAction::NotesViewed, '2026-10-01 12:00:00');
    $colleague->delete();

    $this->actingAs($reader->user)->getJson(trailUri($patient))
        ->assertOk()
        ->assertJsonPath('data.0.professional.name', 'Dr. Colega');
});

test('an expired subscription can still read the trail', function () {
    ['reader' => $reader, 'patient' => $patient, 'organization' => $organization] = trailFixture();
    Subscription::query()->where('organization_id', $organization->id)->delete();
    Subscription::factory()->withStatus(SubscriptionStatus::Expired)->create(['organization_id' => $organization->id]);

    $this->actingAs($reader->user)->getJson(trailUri($patient))->assertOk();
});

test('a guest gets 401', function () {
    $patient = Patient::factory()->create();

    $this->getJson(trailUri($patient))->assertUnauthorized();
});
