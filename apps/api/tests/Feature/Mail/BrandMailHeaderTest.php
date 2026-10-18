<?php

declare(strict_types=1);

use App\Mail\Appointments\AppointmentReminderMail;
use App\Mail\Auth\EmailVerificationMail;
use App\Mail\Contact\ContactRequestReceivedMail;
use App\Mail\Memberships\MembershipInvitationMail;
use App\Models\Appointment;
use App\Models\ContactRequest;
use App\Models\MembershipInvitation;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\Plans\AppointmentLimitApproachingNotification;
use App\Notifications\Subscriptions\SubscriptionExpiredNotification;
use App\Notifications\Subscriptions\SubscriptionGraceStartedNotification;
use Carbon\CarbonImmutable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Markdown;
use Illuminate\Notifications\Notification;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Finder\SplFileInfo;

const MAIL_BRAND_LOGO_URL = 'https://cdn.clini.test/brand/logo.png';

beforeEach(function () {
    config([
        'brand.name' => 'Clini Test',
        'brand.mail_logo_url' => MAIL_BRAND_LOGO_URL,
    ]);
});

dataset('mailables', [
    'appointment reminder' => fn (): Mailable => new AppointmentReminderMail(Appointment::factory()->create()),
    'membership invitation' => fn (): Mailable => new MembershipInvitationMail(MembershipInvitation::factory()->create(), 'https://panel.test/invitaciones/token'),
    'email verification' => fn (): Mailable => new EmailVerificationMail(User::factory()->create(), 'https://panel.test/verificar-email/token'),
    'contact request' => fn (): Mailable => new ContactRequestReceivedMail(ContactRequest::factory()->create()),
]);

dataset('notifications', [
    'subscription expired' => fn (): Notification => new SubscriptionExpiredNotification(Organization::factory()->create()),
    'subscription grace started' => fn (): Notification => new SubscriptionGraceStartedNotification(Organization::factory()->create(), CarbonImmutable::now()->addDays(7)),
    'appointment limit approaching' => fn (): Notification => new AppointmentLimitApproachingNotification(Organization::factory()->create(), CarbonImmutable::now(), 32, 40),
]);

test('a mail opens with the brand logo, named by its alt text', function (Mailable $mail) {
    $mail->assertSeeInHtml('<img src="'.MAIL_BRAND_LOGO_URL.'" alt="Clini Test"', false);
})->with('mailables');

test('a notification opens with the brand logo and signs with the brand name', function (Notification $notification) {
    $html = (string) $notification->toMail(User::factory()->create())->render();

    expect($html)
        ->toContain('<img src="'.MAIL_BRAND_LOGO_URL.'" alt="Clini Test"')
        ->toContain('Clini Test. Todos los derechos reservados.')
        ->not->toContain('Laravel')
        ->not->toContain('All rights reserved.');
})->with('notifications');

test('the text part of a notification names the brand, not the app', function (Notification $notification) {
    $message = $notification->toMail(User::factory()->create());
    $text = (string) app(Markdown::class)->renderText($message->markdown, $message->data());

    expect($text)
        ->toContain('Clini Test')
        ->toContain('Clini Test. Todos los derechos reservados.')
        ->not->toContain('Laravel')
        ->not->toContain('All rights reserved.');
})->with('notifications');

test('the reminder keeps the organization logo below the brand one', function () {
    $organization = Organization::factory()->center()->create(['name' => 'Consultorio Salud']);
    $organization->logo()->create([
        'mime_type' => 'image/png',
        'path' => "organization-logos/{$organization->id}/logo.png",
        'checksum' => hash('sha256', 'logo'),
    ]);

    $mail = new AppointmentReminderMail(Appointment::factory()->create(['organization_id' => $organization->id]));

    $mail->assertSeeInOrderInHtml(['alt="Clini Test"', 'alt="Consultorio Salud"'], false);
});

test('the default mail logo is the file the panel publishes', function () {
    /** @var array<int, string> $origins */
    $origins = config('cors.allowed_origins');
    $config = require config_path('brand.php');

    expect($config['mail_logo_url'])
        ->toStartWith(rtrim($origins[0], '/').'/brand/')
        ->toEndWith('.png');
});

test('only config/brand.php writes a brand path', function () {
    $offenders = collect(Finder::create()->files()->in([app_path(), config_path(), base_path('routes'), database_path(), resource_path('views')]))
        ->filter(fn (SplFileInfo $file): bool => preg_match('#/brand/|\.placeholder\.#', $file->getContents()) === 1)
        ->map(fn (SplFileInfo $file): string => $file->getRealPath())
        ->reject(fn (string $path): bool => $path === config_path('brand.php'))
        ->values()
        ->all();

    expect($offenders)->toBe([]);
});
