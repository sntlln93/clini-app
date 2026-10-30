<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Enums\ClinicalAccessAction;
use App\Mail\ClinicalAccess\PatientAccessCodeMail;
use App\Models\Appointment;
use App\Models\BloodTypeRecord;
use App\Models\ClinicalAccessLog;
use App\Models\ClinicalNote;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\PatientAccessCode;
use App\Models\PatientContact;
use App\Models\ProfessionalService;
use App\Models\Service;
use App\Support\AppointmentDetailsLink;
use App\Support\CurrentOrganization;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

/**
 * #364, ADR 0029: the clinical history is the patient's. A professional reads what they wrote; another professional's
 * records open only with the code the patient shares for their appointment.
 */
afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

/**
 * A patient one professional of the practice already wrote about, and a colleague who will attend them.
 *
 * @return array{organization: Organization, author: Membership, attending: Membership, patient: Patient}
 */
function patientWithHistory(): array
{
    $organization = Organization::factory()->center()->create(['name' => 'Consultorio Norte', 'timezone' => 'America/Argentina/Buenos_Aires']);
    $author = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $author->user->update(['name' => 'Dra. Autora']);
    $attending = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $attending->user->update(['name' => 'Dr. Tratante']);
    $patient = Patient::factory()->withEmail('juan@example.com')->create();
    $patient->organizations()->attach($organization->id);

    $past = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $author->id,
        'patient_id' => $patient->id,
        'start_at' => now()->subMonth(),
        'end_at' => now()->subMonth()->addMinutes(30),
    ]);
    ClinicalNote::factory()->withBody('Nota de la autora.')->create(['appointment_id' => $past->id]);

    return ['organization' => $organization, 'author' => $author, 'attending' => $attending, 'patient' => $patient];
}

function bookWith(Membership $membership, Patient $patient, Membership $actor): Appointment
{
    $professionalService = ProfessionalService::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'service_id' => Service::factory()->create(['name' => 'Psicoterapia'])->id,
    ]);

    $response = test()->actingAs($actor->user)->postJson('/api/v1/appointments', [
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $professionalService->service_id,
        'start_at' => now()->addDays(2)->setTime(13, 0)->utc()->toIso8601String(),
    ])->assertCreated();

    return Appointment::query()->withoutGlobalScope('organization')->findOrFail($response->json('data.id'));
}

function codeOf(Appointment $appointment): PatientAccessCode
{
    return PatientAccessCode::query()->withoutGlobalScope('organization')->where('appointment_id', $appointment->id)->sole();
}

function trailActions(Patient $patient): array
{
    return ClinicalAccessLog::query()->withoutGlobalScope('organization')
        ->where('patient_id', $patient->id)
        ->orderBy('id')
        ->pluck('action')
        ->map(fn (ClinicalAccessAction $action): string => $action->value)
        ->all();
}

test('booking a patient another professional wrote about issues a code and mails only the practice, the day, the time and the code', function () {
    Mail::fake();
    ['attending' => $attending, 'patient' => $patient] = patientWithHistory();

    $appointment = bookWith($attending, $patient, $attending);

    $code = codeOf($appointment);
    expect($code->membership_id)->toBe($attending->id)
        ->and($code->patient_id)->toBe($patient->id)
        ->and($code->redeemed_at)->toBeNull()
        ->and($code->expires_at->equalTo($appointment->start_at->addDays(7)))->toBeTrue()
        ->and(PatientAccessCode::normalize((string) $code->code))->toBe($code->code)
        ->and(strlen((string) $code->code))->toBe(8);
    // Encrypted at rest: the column never holds the code itself.
    expect(DB::table('patient_access_codes')->value('code'))->not->toBe($code->code);

    Mail::assertSent(PatientAccessCodeMail::class, 1);
    Mail::assertSent(PatientAccessCodeMail::class, function (PatientAccessCodeMail $mail) use ($code): bool {
        $html = $mail->render();

        return $mail->hasTo('juan@example.com')
            && str_contains($html, $code->formatted())
            && str_contains($html, 'Consultorio Norte')
            && ! str_contains($html, 'Dr. Tratante')
            && ! str_contains($html, 'Dra. Autora')
            && ! str_contains($html, 'Psicoterapia')
            && ! str_contains($html, 'Nota de la autora.');
    });
    expect(trailActions($patient))->toBe(['access_code_issued', 'access_code_sent']);
});

test('booking a patient nobody else wrote about issues no code', function () {
    Mail::fake();
    ['author' => $author, 'patient' => $patient] = patientWithHistory();

    $appointment = bookWith($author, $patient, $author);

    expect(PatientAccessCode::query()->withoutGlobalScope('organization')->where('appointment_id', $appointment->id)->exists())->toBeFalse();
    Mail::assertNotSent(PatientAccessCodeMail::class);
});

test('a patient without a confirmed email still gets a code, on the appointment page, and nothing is mailed', function () {
    Mail::fake();
    ['attending' => $attending, 'patient' => $patient] = patientWithHistory();
    PatientContact::query()->where('patient_id', $patient->id)->update(['needs_confirmation' => true]);

    $appointment = bookWith($attending, $patient, $attending);

    Mail::assertNotSent(PatientAccessCodeMail::class);
    $this->getJson('/api/v1/booking/appointments/'.app(AppointmentDetailsLink::class)->tokenOf($appointment))
        ->assertOk()
        ->assertJsonPath('access_code', codeOf($appointment)->formatted());
    expect(trailActions($patient))->toBe(['access_code_issued']);
});

test('without the code the attending professional reads only their own records; with it, the other author\'s too', function () {
    Mail::fake();
    ['attending' => $attending, 'patient' => $patient] = patientWithHistory();
    $appointment = bookWith($attending, $patient, $attending);
    $this->travelTo($appointment->start_at);

    $this->actingAs($attending->user)->getJson("/api/v1/patients/{$patient->id}")
        ->assertOk()
        ->assertJsonPath('data.clinical_records_hidden', true);
    $this->actingAs($attending->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")
        ->assertOk()
        ->assertJsonCount(0, 'data');

    // As the patient reads it out: lowercase, with a space instead of the dash.
    $typed = strtolower(str_replace('-', ' ', codeOf($appointment)->formatted()));
    $this->actingAs($attending->user)->postJson("/api/v1/patients/{$patient->id}/access-code-redemptions", ['code' => $typed])
        ->assertCreated();

    $this->actingAs($attending->user)->getJson("/api/v1/patients/{$patient->id}")
        ->assertJsonPath('data.clinical_records_hidden', false);
    $this->actingAs($attending->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")
        ->assertOk()
        ->assertJsonPath('data.0.body', 'Nota de la autora.');
    expect(codeOf($appointment)->redeemed_at)->not->toBeNull()
        ->and(trailActions($patient))->toContain('access_code_redeemed');
    $redeemed = ClinicalAccessLog::query()->where('action', ClinicalAccessAction::AccessCodeRedeemed)->sole();
    expect($redeemed->membership_id)->toBe($attending->id)
        ->and($redeemed->appointment_id)->toBe($appointment->id);
});

test('the access ends with the appointment\'s window, even for a professional who redeemed it', function () {
    Mail::fake();
    ['attending' => $attending, 'patient' => $patient] = patientWithHistory();
    $appointment = bookWith($attending, $patient, $attending);
    $this->travelTo($appointment->start_at);
    $this->actingAs($attending->user)->postJson("/api/v1/patients/{$patient->id}/access-code-redemptions", ['code' => codeOf($appointment)->formatted()])
        ->assertCreated();

    $this->travelTo($appointment->start_at->addDays(7)->addMinute());
    openClinicalHistory($attending, $patient->id);

    $this->actingAs($attending->user)->getJson("/api/v1/patients/{$patient->id}/clinical-notes")
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

test('a code opens nothing once spent, to anyone but its appointment\'s professional, after its window or with its appointment cancelled', function (Closure $spoil) {
    Mail::fake();
    ['attending' => $attending, 'author' => $author, 'patient' => $patient] = patientWithHistory();
    $appointment = bookWith($attending, $patient, $attending);
    $code = codeOf($appointment)->formatted();
    $this->travelTo($appointment->start_at);

    $redeemer = $spoil($this, $appointment, $attending, $author, $patient, $code);

    $this->actingAs($redeemer->user)->postJson("/api/v1/patients/{$patient->id}/access-code-redemptions", ['code' => $code])
        ->assertStatus(409)
        ->assertJsonPath('error.code', 'clinical_access.code_invalid');
})->with([
    'spent' => [function ($test, $appointment, $attending, $author, $patient, $code) {
        $test->actingAs($attending->user)->postJson("/api/v1/patients/{$patient->id}/access-code-redemptions", ['code' => $code])->assertCreated();

        return $attending;
    }],
    'someone else\'s' => [function ($test, $appointment, $attending, $author) {
        return $author;
    }],
    'window over' => [function ($test, $appointment, $attending) {
        $test->travelTo($appointment->start_at->addDays(7)->addMinute());
        openClinicalHistory($attending, $appointment->patient_id);

        return $attending;
    }],
    'cancelled' => [function ($test, $appointment, $attending) {
        $appointment->update(['status' => AppointmentStatus::Cancelled]);
        openClinicalHistory($attending, $appointment->patient_id);

        return $attending;
    }],
]);

test('a wrong code is refused, and guessing is throttled per user', function () {
    Mail::fake();
    ['attending' => $attending, 'patient' => $patient] = patientWithHistory();
    $appointment = bookWith($attending, $patient, $attending);
    $this->travelTo($appointment->start_at);

    foreach (range(1, 5) as $attempt) {
        $this->actingAs($attending->user)->postJson("/api/v1/patients/{$patient->id}/access-code-redemptions", ['code' => 'ZZZZ-ZZZZ'])
            ->assertStatus(409);
    }

    $this->actingAs($attending->user)->postJson("/api/v1/patients/{$patient->id}/access-code-redemptions", ['code' => codeOf($appointment)->formatted()])
        ->assertTooManyRequests();
    expect(trailActions($patient))->not->toContain('access_code_redeemed');
});

test('only a professional who attends the patient may redeem, never by role', function () {
    Mail::fake();
    ['organization' => $organization, 'attending' => $attending, 'patient' => $patient] = patientWithHistory();
    $appointment = bookWith($attending, $patient, $attending);
    $owner = Membership::factory()->owner()->create(['organization_id' => $organization->id]);

    $this->actingAs($owner->user)->postJson("/api/v1/patients/{$patient->id}/access-code-redemptions", ['code' => codeOf($appointment)->formatted()])
        ->assertForbidden();
});

test('the reception resends the code to one confirmed address of the patient, without seeing it', function () {
    Mail::fake();
    ['organization' => $organization, 'attending' => $attending, 'patient' => $patient] = patientWithHistory();
    $appointment = bookWith($attending, $patient, $attending);
    Mail::fake();
    $reception = Membership::factory()->staff()->create(['organization_id' => $organization->id]);
    $second = PatientContact::factory()->create(['patient_id' => $patient->id, 'value' => 'madre@example.com', 'position' => 1]);

    $response = $this->actingAs($reception->user)->postJson("/api/v1/appointments/{$appointment->id}/access-code-deliveries", ['contact_id' => $second->id]);

    $response->assertNoContent();
    expect($response->getContent())->not->toContain(codeOf($appointment)->formatted());
    Mail::assertSent(PatientAccessCodeMail::class, 1);
    Mail::assertSent(PatientAccessCodeMail::class, fn (PatientAccessCodeMail $mail): bool => $mail->hasTo('madre@example.com')
        && $mail->code === codeOf($appointment)->formatted());
    $resent = ClinicalAccessLog::query()->where('action', ClinicalAccessAction::AccessCodeResent)->sole();
    expect($resent->membership_id)->toBe($reception->id)
        ->and($resent->appointment_id)->toBe($appointment->id);
});

test('resending issues the code when the history was written after the booking', function () {
    Mail::fake();
    ['author' => $author, 'attending' => $attending, 'patient' => $patient] = patientWithHistory();
    $fresh = Patient::factory()->withEmail('nuevo@example.com')->create();
    $appointment = bookWith($attending, $fresh, $attending);
    expect(PatientAccessCode::query()->withoutGlobalScope('organization')->count())->toBe(0);

    $this->actingAs($attending->user)->postJson("/api/v1/appointments/{$appointment->id}/access-code-deliveries", [
        'contact_id' => $fresh->contacts()->sole()->id,
    ])->assertNoContent();

    expect(codeOf($appointment)->membership_id)->toBe($attending->id);
    Mail::assertSent(PatientAccessCodeMail::class, fn (PatientAccessCodeMail $mail): bool => $mail->hasTo('nuevo@example.com'));
});

test('the code is never resent to an unconfirmed address, another patient\'s, or for an appointment that no longer brings it', function (Closure $setUp, string $code) {
    Mail::fake();
    ['attending' => $attending, 'patient' => $patient] = patientWithHistory();
    $appointment = bookWith($attending, $patient, $attending);
    Mail::fake();

    $contactId = $setUp($appointment, $patient);

    $this->actingAs($attending->user)->postJson("/api/v1/appointments/{$appointment->id}/access-code-deliveries", ['contact_id' => $contactId])
        ->assertStatus(409)
        ->assertJsonPath('error.code', $code);
    Mail::assertNotSent(PatientAccessCodeMail::class);
})->with([
    'unconfirmed' => [fn ($appointment, $patient) => PatientContact::factory()->create(['patient_id' => $patient->id, 'needs_confirmation' => true, 'position' => 1])->id, 'clinical_access.contact_unavailable'],
    'a phone' => [fn ($appointment, $patient) => PatientContact::factory()->create(['patient_id' => $patient->id, 'type' => 'phone', 'value' => '+5491122334455', 'position' => 1])->id, 'clinical_access.contact_unavailable'],
    'another patient\'s' => [fn () => PatientContact::factory()->create()->id, 'clinical_access.contact_unavailable'],
    'cancelled' => [function ($appointment, $patient) {
        $appointment->update(['status' => AppointmentStatus::Cancelled]);

        return $patient->contacts()->first()->id;
    }, 'clinical_access.code_unavailable'],
]);

test('resending is for whoever manages the appointment', function () {
    Mail::fake();
    ['attending' => $attending, 'patient' => $patient] = patientWithHistory();
    $appointment = bookWith($attending, $patient, $attending);
    $outsider = Membership::factory()->owner()->create();

    $this->actingAs($outsider->user)->postJson("/api/v1/appointments/{$appointment->id}/access-code-deliveries", [
        'contact_id' => $patient->contacts()->first()->id,
    ])->assertForbidden();
});

test('the appointment page stops showing the code once it was redeemed', function () {
    Mail::fake();
    ['attending' => $attending, 'patient' => $patient] = patientWithHistory();
    $appointment = bookWith($attending, $patient, $attending);
    $token = app(AppointmentDetailsLink::class)->tokenOf($appointment);

    $this->getJson("/api/v1/booking/appointments/{$token}")->assertJsonPath('access_code', codeOf($appointment)->formatted());

    $this->actingAs($attending->user)->postJson("/api/v1/patients/{$patient->id}/access-code-redemptions", ['code' => codeOf($appointment)->formatted()])
        ->assertCreated();
    app(CurrentOrganization::class)->set(null);

    $this->getJson("/api/v1/booking/appointments/{$token}")->assertJsonPath('access_code', null);
});

test('recording a blood type compares against the one the author reads, so a refusal never reveals another\'s', function () {
    ['author' => $author, 'attending' => $attending, 'patient' => $patient] = patientWithHistory();
    $past = Appointment::query()->where('membership_id', $author->id)->sole();
    BloodTypeRecord::factory()->create(['appointment_id' => $past->id, 'blood_type' => 'A+']);
    $own = Appointment::factory()->create([
        'organization_id' => $attending->organization_id,
        'membership_id' => $attending->id,
        'patient_id' => $patient->id,
        'start_at' => now(),
        'end_at' => now()->addMinutes(30),
    ]);

    $this->actingAs($attending->user)->postJson("/api/v1/appointments/{$own->id}/blood-types", ['blood_type' => 'A+'])
        ->assertCreated();
});
