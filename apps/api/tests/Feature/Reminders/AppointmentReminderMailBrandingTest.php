<?php

declare(strict_types=1);

use App\Mail\Appointments\AppointmentReminderMail;
use App\Models\Appointment;
use App\Models\Organization;
use App\Models\OrganizationLogo;

function reminderFor(Organization $organization): AppointmentReminderMail
{
    return new AppointmentReminderMail(Appointment::factory()->create(['organization_id' => $organization->id]));
}

function keepLogo(Organization $organization): string
{
    OrganizationLogo::query()->create([
        'organization_id' => $organization->id,
        'mime_type' => 'image/png',
        'path' => "organization-logos/{$organization->id}/logo.png",
        'checksum' => hash('sha256', 'logo'),
    ]);

    return config('app.url')."/api/v1/booking/{$organization->slug}/logo?v=".substr(hash('sha256', 'logo'), 0, 16);
}

test('the reminder shows the organization logo, by absolute URL, on a paid plan', function () {
    $organization = Organization::factory()->center()->create(['name' => 'Consultorio Salud']);
    $url = keepLogo($organization);

    $mail = reminderFor($organization);

    $mail->assertSeeInHtml('<img src="'.e($url).'" alt="Consultorio Salud"', false);
    expect($url)->toStartWith('http');
});

test('the reminder has no logo on a paid plan without one', function () {
    $mail = reminderFor(Organization::factory()->center()->create());

    $mail->assertDontSeeInHtml('/logo?v=', false);
});

test('the reminder of a suspended organization has no logo, whose route answers 403', function () {
    $organization = Organization::factory()->center()->create(['suspended_at' => now()]);
    keepLogo($organization);

    $mail = reminderFor($organization);

    $mail->assertDontSeeInHtml('/logo?v=', false);
});

test('the reminder has no logo on Free, even with one kept from a paid plan', function () {
    $organization = Organization::factory()->create();
    keepLogo($organization);

    $mail = reminderFor($organization);

    $mail->assertDontSeeInHtml('/logo?v=', false);
});
