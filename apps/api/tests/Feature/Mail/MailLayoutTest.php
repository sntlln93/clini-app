<?php

declare(strict_types=1);

use App\Enums\ErrorCode;
use App\Enums\ExternalSource;
use App\Mail\Account\AccountDeletedMail;
use App\Mail\Account\AccountDeletionCancelledMail;
use App\Mail\Account\AccountDeletionRequestedMail;
use App\Mail\Account\AccountDeletionVoidedMail;
use App\Mail\Appointments\AppointmentReminderMail;
use App\Mail\Auth\EmailVerificationMail;
use App\Mail\Auth\PasswordResetMail;
use App\Mail\ClinicalAccess\PatientAccessCodeMail;
use App\Mail\Contact\ContactRequestReceivedMail;
use App\Mail\ExternalSources\ExternalSourceOutageMail;
use App\Mail\ExternalSources\ExternalSourceRecoveredMail;
use App\Mail\Memberships\MembershipInvitationMail;
use App\Models\Appointment;
use App\Models\ContactRequest;
use App\Models\Invoice;
use App\Models\MembershipInvitation;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\Invoices\InvoiceIssuedNotification;
use App\Notifications\Plans\AppointmentLimitApproachingNotification;
use App\Notifications\Subscriptions\SubscriptionExpiredNotification;
use App\Notifications\Subscriptions\SubscriptionGraceStartedNotification;
use Carbon\CarbonImmutable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Markdown;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Blade;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Finder\SplFileInfo;

/**
 * #422: every mail, its own and Laravel's notifications, is drawn by the one layout
 * (resources/views/components/email/layout.blade.php) and keeps its links and data.
 */
const MAIL_LAYOUT_LOGO_URL = 'https://cdn.clini.test/brand/logo.png';
const MAIL_LAYOUT_ICON_URL = 'https://cdn.clini.test/brand/icon.png';

beforeEach(function () {
    config([
        'brand.name' => 'Clini Test',
        'brand.mail_logo_url' => MAIL_LAYOUT_LOGO_URL,
        'brand.mail_icon_url' => MAIL_LAYOUT_ICON_URL,
        'admin.allowed_origins' => ['https://dashboard.test'],
    ]);
});

function mailLayoutAppointment(): Appointment
{
    $organization = Organization::factory()->create([
        'name' => 'Consultorio Salud',
        'timezone' => 'America/Argentina/Buenos_Aires',
    ]);

    return Appointment::factory()->create([
        'organization_id' => $organization->id,
        'start_at' => '2026-08-03 13:00:00',
        'end_at' => '2026-08-03 13:45:00',
    ]);
}

/**
 * The classes that subclass $parent under $directory: every mail the app sends.
 *
 * @return list<class-string>
 */
function mailClassesUnder(string $directory, string $parent): array
{
    return collect(Finder::create()->files()->name('*.php')->in(app_path($directory)))
        ->map(fn (SplFileInfo $file): string => 'App\\'.str_replace(['/', '.php'], ['\\', ''], $directory.'/'.$file->getRelativePathname()))
        ->filter(fn (string $class): bool => is_subclass_of($class, $parent))
        ->sort()
        ->values()
        ->all();
}

/**
 * Every Mailable, with what its rendering must keep: its button's link, if it has one, and the rest of its data.
 *
 * @return array<class-string<Mailable>, array{0: Closure(): Mailable, 1: string|null, 2: list<string>}>
 */
function mailableCases(): array
{
    return [
        AccountDeletedMail::class => [fn (): Mailable => new AccountDeletedMail('Ana Pérez'), null, ['¡Hola, Ana Pérez!', 'eliminamos tu cuenta de Clini']],
        AccountDeletionCancelledMail::class => [fn (): Mailable => new AccountDeletionCancelledMail('Ana Pérez'), null, ['¡Hola, Ana Pérez!', 'cancelamos el pedido']],
        AccountDeletionRequestedMail::class => [fn (): Mailable => new AccountDeletionRequestedMail('Ana Pérez', '9 de noviembre de 2026'), 'http://localhost:5174/login', ['¡Hola, Ana Pérez!', '9 de noviembre de 2026']],
        AccountDeletionVoidedMail::class => [fn (): Mailable => new AccountDeletionVoidedMail('Ana Pérez', ErrorCode::AccountDeletionFutureAppointments, ['Consultorio Oeste']), null, ['¡Hola, Ana Pérez!', 'tenés turnos por atender en', 'Consultorio Oeste']],
        AppointmentReminderMail::class => [fn (): Mailable => new AppointmentReminderMail(mailLayoutAppointment()), '#href="http://localhost:5174/turno/[A-Za-z0-9_-]{40,}"#', ['Consultorio Salud', 'lunes 3 de agosto a las 10:00', 'Ver los detalles del turno', 'https://calendar.google.com/calendar/render?action=TEMPLATE', 'turno.ics']],
        EmailVerificationMail::class => [fn (): Mailable => new EmailVerificationMail(User::factory()->create(['name' => 'Ana Pérez']), 'https://panel.test/verificar-email/token'), 'https://panel.test/verificar-email/token', ['¡Hola, Ana Pérez!', 'vence en 48 horas']],
        PasswordResetMail::class => [fn (): Mailable => new PasswordResetMail('Ana Pérez', 'https://panel.test/restablecer-contrasena/token'), 'https://panel.test/restablecer-contrasena/token', ['¡Hola, Ana Pérez!', 'vence en 60 minutos']],
        PatientAccessCodeMail::class => [fn (): Mailable => new PatientAccessCodeMail(mailLayoutAppointment(), 'ABCD-1234'), null, ['Consultorio Salud', 'lunes 3 de agosto a las 10:00', 'ABCD-1234']],
        ContactRequestReceivedMail::class => [fn (): Mailable => new ContactRequestReceivedMail(ContactRequest::factory()->create(['name' => 'Laura Gómez', 'email' => 'laura@centro.test', 'message' => 'Quiero saber más.'])), null, ['Laura Gómez', 'laura@centro.test', 'Quiero saber más.', 'Plan de interés:', 'https://dashboard.test/contactos']],
        ExternalSourceOutageMail::class => [fn (): Mailable => new ExternalSourceOutageMail(ExternalSource::MedicationSearch, CarbonImmutable::parse('2026-11-08 13:00:00'), 'status'), null, ['Buscador Nacional de Medicamentos no responde', '08/11/2026 10:00', 'respondió con un estado de error', '<code>status</code>']],
        ExternalSourceRecoveredMail::class => [fn (): Mailable => new ExternalSourceRecoveredMail(ExternalSource::ProfessionalRegistry, CarbonImmutable::parse('2026-11-08 13:00:00'), CarbonImmutable::parse('2026-11-08 14:25:00')), null, ['Buscador Nacional de Profesionales de la Salud volvió a responder', '08/11/2026 10:00', '08/11/2026 11:25', '1 h 25 min']],
        MembershipInvitationMail::class => [fn (): Mailable => new MembershipInvitationMail(MembershipInvitation::factory()->for(Organization::factory()->state(['name' => 'Consultorio Dos']))->create(), 'https://panel.test/invitaciones/token'), 'https://panel.test/invitaciones/token', ['Consultorio Dos', 'vence en 7 días']],
    ];
}

/**
 * Every Notification, with its button's path in the panel and the rest of its data. A path, not a URL: the datasets
 * read these keys before the app boots, when config() can't build it yet.
 *
 * @return array<class-string<Notification>, array{0: Closure(): Notification, 1: string, 2: list<string>}>
 */
function notificationCases(): array
{
    return [
        InvoiceIssuedNotification::class => [fn (): Notification => new InvoiceIssuedNotification(Invoice::factory()->issued(12)->create()), '/ajustes/suscripcion', ['Factura emitida', 'Emitimos la factura C 00001-00000012', '$ 15.000,00', 'CAE: 90000100000012', 'Ver mis facturas']],
        AppointmentLimitApproachingNotification::class => [fn (): Notification => new AppointmentLimitApproachingNotification(Organization::factory()->create(['name' => 'Consultorio Dos']), CarbonImmutable::parse('2026-11-01'), 32, 40), '/ajustes/suscripcion', ['Límite de turnos', 'Consultorio Dos ya tiene 32 turnos en noviembre de 2026', 'Pasar a Consultorio']],
        SubscriptionExpiredNotification::class => [fn (): Notification => new SubscriptionExpiredNotification(Organization::factory()->create(['name' => 'Consultorio Dos'])), '/ajustes/suscripcion', ['Suscripción vencida', 'suscripción de Consultorio Dos sin que se registrara el pago', 'Regularizar el pago']],
        SubscriptionGraceStartedNotification::class => [fn (): Notification => new SubscriptionGraceStartedNotification(Organization::factory()->create(['name' => 'Consultorio Dos']), CarbonImmutable::parse('2026-11-15')), '/ajustes/suscripcion', ['Pago pendiente', 'suscripción de Consultorio Dos', '15/11/2026', 'Regularizar el pago']],
    ];
}

/**
 * The layout's marks: one document, the brand's logo and icon named by their alt text, its card and its footer,
 * and nothing left of Laravel's own layout or theme.
 */
function expectMailLayout(string $html): void
{
    expect(substr_count(strtolower($html), '<html'))->toBe(1)
        ->and(substr_count(strtolower($html), '<body'))->toBe(1)
        ->and($html)
        ->toContain('<img src="'.MAIL_LAYOUT_LOGO_URL.'" alt="Clini Test"')
        ->toContain('<img src="'.MAIL_LAYOUT_ICON_URL.'" alt="Clini Test"')
        ->toContain('border-top: 4px solid #0d7179')
        ->toContain('Clini Test · Más tiempo para atender.')
        ->not->toContain('Laravel')
        ->not->toContain('Todos los derechos reservados')
        ->not->toContain('#3869d4');
}

/**
 * A button's link shows twice: on the button, and in «Si el botón no funciona…» below it. A link with a random token
 * comes as a pattern of its href (`#…#`).
 */
function expectMailAction(string $html, ?string $url): void
{
    if ($url === null) {
        expect($html)->not->toContain('Si el botón no funciona');

        return;
    }

    $hrefs = str_starts_with($url, '#') ? preg_match_all($url, $html) : substr_count($html, 'href="'.e($url).'"');

    expect($hrefs)->toBe(2)
        ->and($html)->toContain('Si el botón no funciona, copiá y pegá este enlace en tu navegador:');
}

test('every mailable and every notification has a case here', function () {
    expect(mailClassesUnder('Mail', Mailable::class))->toBe(collect(mailableCases())->keys()->sort()->values()->all())
        ->and(mailClassesUnder('Notifications', Notification::class))->toBe(collect(notificationCases())->keys()->sort()->values()->all());
});

test('a mail is drawn by the layout and keeps its links and data', function (string $class) {
    [$make, $actionUrl, $data] = mailableCases()[$class];

    $html = $make()->render();

    expectMailLayout($html);
    expectMailAction($html, $actionUrl);
    expect($html)->toContain(...array_map(fn (string $value): string => str_contains($value, '<') ? $value : e($value), $data));
})->with(array_keys(mailableCases()));

test('a notification is drawn by the layout and keeps its links and data', function (string $class) {
    [$make, $actionPath, $data] = notificationCases()[$class];
    $actionUrl = rtrim((string) config('cors.allowed_origins')[0], '/').$actionPath;

    $html = (string) $make()->toMail(User::factory()->create())->render();

    expectMailLayout($html);
    expectMailAction($html, $actionUrl);
    expect($html)->toContain('¡Hola!</h1>')
        ->toContain(...array_map(fn (string $value): string => e($value), $data));
})->with(array_keys(notificationCases()));

test('the text part of a notification keeps its data and the brand footer', function (string $class) {
    [$make, $actionPath] = notificationCases()[$class];
    $actionUrl = rtrim((string) config('cors.allowed_origins')[0], '/').$actionPath;
    $message = $make()->toMail(User::factory()->create());

    $text = (string) app(Markdown::class)->renderText($message->markdown, $message->data());

    expect($text)
        ->toContain('¡Hola!')
        ->toContain("{$message->actionText}: {$actionUrl}")
        ->toContain('Clini Test · Más tiempo para atender.')
        ->not->toContain('<')
        ->not->toContain('Laravel');
})->with(array_keys(notificationCases()));

test('every mail view uses the layout, and none draws its own document or brand header', function () {
    $views = collect(Finder::create()->files()->in(resource_path('views/emails')));

    expect($views)->not->toBeEmpty();
    foreach ($views as $view) {
        expect($view->getContents())
            ->toContain('<x-email.layout')
            ->not->toContain('<html')
            ->not->toContain('<body')
            ->not->toContain('config(\'brand.');
    }
});

test('the layout draws only the body when no other section is given', function () {
    $html = Blade::render('<x-email.layout :icon="false">Solo el cuerpo</x-email.layout>');

    expect($html)
        ->toContain('Solo el cuerpo')
        ->toContain('<img src="'.MAIL_LAYOUT_LOGO_URL.'" alt="Clini Test"')
        ->toContain('Clini Test · Más tiempo para atender.')
        ->not->toContain(MAIL_LAYOUT_ICON_URL)
        ->not->toContain('<h1')
        ->not->toContain('text-transform: uppercase')
        ->not->toContain('background-color: #f3f8f7')
        ->not->toContain('<a ')
        ->not->toContain('Si el botón no funciona');
});

test('the layout draws every section in the mockup\'s order, escaping what it is given', function () {
    $html = Blade::render(<<<'BLADE'
        <x-email.layout title="Título <b>" label="Etiqueta" eyebrow="Ojo" action-url="https://panel.test/accion?a=1&b=2" action-text="Hacer algo" note-title="Título de la nota">
            Cuerpo del correo
            <x-slot:note>Texto de la nota</x-slot:note>
        </x-email.layout>
        BLADE);

    expect($html)->toContain('Título &lt;b&gt;')
        ->and(substr_count($html, 'href="https://panel.test/accion?a=1&amp;b=2"'))->toBe(2)
        ->and($html)->toContain('>https://panel.test/accion?a=1&amp;b=2</a>');
    $positions = array_map(
        fn (string $needle): int|false => strpos($html, $needle),
        [MAIL_LAYOUT_LOGO_URL, 'Etiqueta', MAIL_LAYOUT_ICON_URL, 'Ojo', 'Título &lt;b&gt;</h1>', 'Cuerpo del correo', 'Hacer algo', 'Título de la nota', 'Texto de la nota', 'Si el botón no funciona', 'Más tiempo para atender.'],
    );
    $sorted = $positions;
    sort($sorted);

    expect($positions)->each->toBeInt()
        ->and($positions)->toBe($sorted);
});

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

test('the default mail logo and icon are files the panel publishes', function (string $key) {
    /** @var array<int, string> $origins */
    $origins = config('cors.allowed_origins');
    $config = require config_path('brand.php');

    expect($config[$key])
        ->toStartWith(rtrim($origins[0], '/').'/brand/')
        ->toEndWith('.png');
})->with(['mail_logo_url', 'mail_icon_url']);

test('only config/brand.php writes a brand path', function () {
    $offenders = collect(Finder::create()->files()->in([app_path(), config_path(), base_path('routes'), database_path(), resource_path('views')]))
        ->filter(fn (SplFileInfo $file): bool => preg_match('#/brand/|\.placeholder\.#', $file->getContents()) === 1)
        ->map(fn (SplFileInfo $file): string => $file->getRealPath())
        ->reject(fn (string $path): bool => $path === config_path('brand.php'))
        ->values()
        ->all();

    expect($offenders)->toBe([]);
});
