<?php

declare(strict_types=1);

use App\Enums\AppointmentStatus;
use App\Models\Appointment;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\Patient;
use App\Models\Service;
use App\Support\CurrentOrganization;

afterEach(function () {
    app(CurrentOrganization::class)->set(null);
});

test('returns the patient\'s appointments in the active organization ordered descending, each item carrying service, professional, organization, status and attendance', function () {
    $organization = Organization::factory()->create(['name' => 'Consultorio Central']);
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $patient = Patient::factory()->create();
    $patient->organizations()->attach($organization->id);
    $service = Service::factory()->create(['name' => 'Consulta general']);

    $older = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $service->id,
        'status' => AppointmentStatus::Completed,
        'start_at' => now()->subDays(5),
        'end_at' => now()->subDays(5)->addMinutes(30),
    ]);
    $newer = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
        'service_id' => $service->id,
        'status' => AppointmentStatus::Arrived,
        'start_at' => now()->subDay(),
        'end_at' => now()->subDay()->addMinutes(30),
    ]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/patients/{$patient->id}/appointments");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(2);
    $response->assertJsonPath('data.0.id', $newer->id);
    $response->assertJsonPath('data.1.id', $older->id);
    $response->assertJsonPath('data.0.service_name', 'Consulta general');
    $response->assertJsonPath('data.0.professional_name', $membership->user->name);
    $response->assertJsonPath('data.0.organization_name', 'Consultorio Central');
    $response->assertJsonPath('data.0.status', 'arrived');
    $response->assertJsonPath('data.1.status', 'completed');
});

test('appointments belonging to another organization are not included', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $patient = Patient::factory()->create();
    $patient->organizations()->attach($organization->id);

    $ownAppointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
    ]);

    $otherOrganizationMembership = Membership::factory()->create();
    Appointment::factory()->create([
        'organization_id' => $otherOrganizationMembership->organization_id,
        'membership_id' => $otherOrganizationMembership->id,
        'patient_id' => $patient->id,
    ]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/patients/{$patient->id}/appointments");

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    $response->assertJsonPath('data.0.id', $ownAppointment->id);
});

test('each item flags whether it belongs to the current membership', function () {
    $organization = Organization::factory()->create();
    $membership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $otherMembership = Membership::factory()->professional()->create(['organization_id' => $organization->id]);
    $patient = Patient::factory()->create();
    $patient->organizations()->attach($organization->id);

    $ownAppointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'patient_id' => $patient->id,
    ]);
    $otherAppointment = Appointment::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $otherMembership->id,
        'patient_id' => $patient->id,
    ]);

    $response = $this->actingAs($membership->user)->getJson("/api/v1/patients/{$patient->id}/appointments");

    $response->assertOk();
    $data = collect($response->json('data'));
    expect($data->firstWhere('id', $ownAppointment->id)['is_own_membership'])->toBeTrue();
    expect($data->firstWhere('id', $otherAppointment->id)['is_own_membership'])->toBeFalse();
});

test('a patient not linked to the active organization is denied, matching the rest of the patients module', function () {
    $membership = Membership::factory()->create();
    $patient = Patient::factory()->create();

    $response = $this->actingAs($membership->user)->getJson("/api/v1/patients/{$patient->id}/appointments");

    $response->assertStatus(403);
});

test('a guest gets 401', function () {
    $patient = Patient::factory()->create();

    $this->getJson("/api/v1/patients/{$patient->id}/appointments")->assertStatus(401);
});
