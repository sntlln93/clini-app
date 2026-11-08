<?php

declare(strict_types=1);

use App\Exceptions\Professionals\ProfessionalRegistryUnavailableException;
use App\Mail\Professionals\ProfessionalRegistryOutageMail;
use App\Mail\Professionals\ProfessionalRegistryRecoveredMail;
use App\Services\Professionals\NationalProfessionalSearchService;
use App\Support\ProfessionalRegistryOutage;
use Carbon\CarbonImmutable;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

const OUTAGE_LOOKED_UP_DOCUMENT = '30123456';

const OUTAGE_PROBE_DOCUMENT = '99999999';

const OUTAGE_TEAM_ADDRESS = 'equipo@clini.test';

/**
 * What the registry answers the DNI's POST: a page, or null for a 500 (the form's GET always answers).
 */
function registryOutageAnswering(?string &$page): void
{
    fakeNationalProfessionalSearch(function () use (&$page) {
        return $page === null ? Http::response('', 500) : Http::response($page);
    });
}

function registryOutageLookUp(): void
{
    try {
        app(NationalProfessionalSearchService::class)->lookUp(OUTAGE_LOOKED_UP_DOCUMENT);
    } catch (ProfessionalRegistryUnavailableException) {
        // A failure, which the outage records.
    }
}

beforeEach(function () {
    Http::preventStrayRequests();
    Mail::fake();
    config([
        'services.national_professional_search.outage_alert_minutes' => 15,
        'services.national_professional_search.alert_email' => OUTAGE_TEAM_ADDRESS,
        'services.national_professional_search.probe_document' => OUTAGE_PROBE_DOCUMENT,
    ]);
    $this->travelTo(CarbonImmutable::parse('2026-11-08 13:00:00', 'UTC'));
});

afterEach(function () {
    $this->travelBack();
});

test('the first failure starts the outage and a later one doesn\'t move its start', function () {
    $page = null;
    registryOutageAnswering($page);

    expect(app(ProfessionalRegistryOutage::class)->ongoing())->toBeFalse();

    registryOutageLookUp();
    expect(app(ProfessionalRegistryOutage::class)->ongoing())->toBeTrue();

    // A failure 10 minutes in would mail 15 minutes later if it had restarted the outage.
    $this->travel(10)->minutes();
    registryOutageLookUp();
    $this->travel(5)->minutes();
    registryOutageLookUp();

    Mail::assertQueued(ProfessionalRegistryOutageMail::class, fn (ProfessionalRegistryOutageMail $mail): bool => $mail->startedAt->equalTo(CarbonImmutable::parse('2026-11-08 13:00:00', 'UTC')));
});

test('nobody is told before the outage reaches the threshold', function () {
    $page = null;
    registryOutageAnswering($page);

    registryOutageLookUp();
    $this->travel(14)->minutes();
    registryOutageLookUp();

    Mail::assertNothingOutgoing();
});

test('the threshold is the configured one', function () {
    config(['services.national_professional_search.outage_alert_minutes' => 30]);
    $page = null;
    registryOutageAnswering($page);

    registryOutageLookUp();
    $this->travel(15)->minutes();
    registryOutageLookUp();
    Mail::assertNothingOutgoing();

    $this->travel(15)->minutes();
    registryOutageLookUp();
    Mail::assertQueuedCount(1);
});

test('the team is told once per outage, with its start and last step', function () {
    $page = null;
    registryOutageAnswering($page);

    registryOutageLookUp();
    $this->travel(15)->minutes();
    $page = '<html>otra página</html>';
    registryOutageLookUp();
    $this->travel(5)->minutes();
    registryOutageLookUp();

    Mail::assertQueuedCount(1);
    Mail::assertQueued(ProfessionalRegistryOutageMail::class, function (ProfessionalRegistryOutageMail $mail): bool {
        // 13:00 UTC, in Argentina's time.
        $mail->assertSeeInHtml('08/11/2026 10:00')
            ->assertSeeInHtml('puede haber cambiado el formato de la página');

        return $mail->hasTo(OUTAGE_TEAM_ADDRESS)
            && $mail->step === 'response'
            && $mail->startedAt->equalTo(CarbonImmutable::parse('2026-11-08 13:00:00', 'UTC'));
    });
});

test('a lookup that can\'t read its page keeps the outage until a page with results, whatever the probe reads', function () {
    $page = '<html>resultados con otro formato</html>';
    registryOutageAnswering($page);
    registryOutageLookUp();

    // The probe's DNI, like any DNI nobody holds, still reads «no results»: that doesn't prove results read again.
    $page = nationalProfessionalSearchFixture('no-results.html');
    $this->travel(5)->minutes();
    $this->artisan('professionals:probe-registry')->assertSuccessful();
    $page = nationalProfessionalSearchFixture('invalid-document.html');
    registryOutageLookUp();
    expect(app(ProfessionalRegistryOutage::class)->ongoing())->toBeTrue();

    // So the next lookup that fails past the threshold tells the team.
    $page = '<html>resultados con otro formato</html>';
    $this->travel(10)->minutes();
    registryOutageLookUp();
    Mail::assertQueued(ProfessionalRegistryOutageMail::class, fn (ProfessionalRegistryOutageMail $mail): bool => $mail->startedAt->equalTo(CarbonImmutable::parse('2026-11-08 13:00:00', 'UTC')));

    $page = nationalProfessionalSearchFixture('results.html');
    registryOutageLookUp();
    expect(app(ProfessionalRegistryOutage::class)->ongoing())->toBeFalse();
    Mail::assertQueued(ProfessionalRegistryRecoveredMail::class);
});

test('a probe that can\'t read its page doesn\'t wait for results to end the outage', function () {
    $page = '<html>otra página</html>';
    registryOutageAnswering($page);
    $this->artisan('professionals:probe-registry')->assertFailed();

    $page = nationalProfessionalSearchFixture('no-results.html');
    $this->artisan('professionals:probe-registry')->assertSuccessful();

    expect(app(ProfessionalRegistryOutage::class)->ongoing())->toBeFalse();
});

test('an answer the adapter reads ends the outage, and tells the team how long it lasted', function (string $fixture) {
    $page = null;
    registryOutageAnswering($page);

    registryOutageLookUp();
    $this->travel(15)->minutes();
    registryOutageLookUp();
    $this->travel(70)->minutes();
    $page = nationalProfessionalSearchFixture($fixture);
    registryOutageLookUp();

    expect(app(ProfessionalRegistryOutage::class)->ongoing())->toBeFalse();
    Mail::assertQueued(ProfessionalRegistryRecoveredMail::class, function (ProfessionalRegistryRecoveredMail $mail): bool {
        $mail->assertSeeInHtml('1 h 25 min')
            ->assertSeeInHtml('08/11/2026 10:00')
            ->assertSeeInHtml('08/11/2026 11:25');

        return $mail->hasTo(OUTAGE_TEAM_ADDRESS);
    });

    // The next outage is a new one, told again.
    $page = null;
    registryOutageLookUp();
    $this->travel(15)->minutes();
    registryOutageLookUp();
    Mail::assertQueued(ProfessionalRegistryOutageMail::class, 2);
})->with(['results.html', 'no-results.html', 'invalid-document.html']);

test('an outage nobody was told of ends without a mail', function () {
    $page = null;
    registryOutageAnswering($page);

    registryOutageLookUp();
    $this->travel(5)->minutes();
    $page = nationalProfessionalSearchFixture('no-results.html');
    registryOutageLookUp();

    expect(app(ProfessionalRegistryOutage::class)->ongoing())->toBeFalse();
    Mail::assertNothingOutgoing();
});

test('without the registry\'s own address the mail goes to the contact form\'s, and without either nowhere', function () {
    config([
        'services.national_professional_search.alert_email' => null,
        'contact.notification_email' => 'contacto@clini.test',
    ]);
    $page = null;
    registryOutageAnswering($page);

    registryOutageLookUp();
    $this->travel(15)->minutes();
    registryOutageLookUp();
    Mail::assertQueued(ProfessionalRegistryOutageMail::class, fn (ProfessionalRegistryOutageMail $mail): bool => $mail->hasTo('contacto@clini.test'));

    config(['contact.notification_email' => null]);
    $page = nationalProfessionalSearchFixture('no-results.html');
    registryOutageLookUp();
    Mail::assertQueuedCount(1);
});

test('no mail carries a DNI: neither the one looked up nor the probe\'s', function () {
    $page = null;
    registryOutageAnswering($page);

    registryOutageLookUp();
    $this->travel(15)->minutes();
    $this->artisan('professionals:probe-registry')->assertFailed();
    $page = nationalProfessionalSearchFixture('no-results.html');
    registryOutageLookUp();

    Mail::assertQueuedCount(2);
    foreach ([...Mail::queued(ProfessionalRegistryOutageMail::class), ...Mail::queued(ProfessionalRegistryRecoveredMail::class)] as $mail) {
        $mail->assertDontSeeInHtml(OUTAGE_LOOKED_UP_DOCUMENT)
            ->assertDontSeeInHtml(OUTAGE_PROBE_DOCUMENT)
            ->assertDontSeeInText(OUTAGE_LOOKED_UP_DOCUMENT)
            ->assertDontSeeInText(OUTAGE_PROBE_DOCUMENT);
        expect($mail->envelope()->subject)->not->toContain(OUTAGE_LOOKED_UP_DOCUMENT)->not->toContain(OUTAGE_PROBE_DOCUMENT);
    }
});

test('the probe looks up its DNI even while the registry is paused, and its answer ends the outage', function () {
    $page = null;
    registryOutageAnswering($page);
    registryOutageLookUp();
    $this->travel(15)->minutes();
    registryOutageLookUp();
    expect(app(NationalProfessionalSearchService::class)->available())->toBeFalse();

    $page = nationalProfessionalSearchFixture('no-results.html');
    $this->travel(1)->minutes();
    $this->artisan('professionals:probe-registry')
        ->expectsOutput('El registro respondió «sin resultados».')
        ->assertSuccessful();

    Http::assertSent(fn (Request $request): bool => $request->method() === 'POST' && $request['dni'] === OUTAGE_PROBE_DOCUMENT);
    expect(app(ProfessionalRegistryOutage::class)->ongoing())->toBeFalse();
    Mail::assertQueued(ProfessionalRegistryRecoveredMail::class);
});

test('a failed probe starts the outage, and tells the team once it reaches the threshold', function () {
    $page = null;
    registryOutageAnswering($page);

    $this->artisan('professionals:probe-registry')
        ->expectsOutput('El registro no respondió (status).')
        ->assertFailed();
    expect(app(ProfessionalRegistryOutage::class)->ongoing())->toBeTrue();
    Mail::assertNothingOutgoing();

    $this->travel(15)->minutes();
    $this->artisan('professionals:probe-registry')->assertFailed();
    Mail::assertQueued(ProfessionalRegistryOutageMail::class, fn (ProfessionalRegistryOutageMail $mail): bool => $mail->step === 'status');
});

test('a probe answered with anything but «no results» fails, though the registry answered', function (string $fixture) {
    $page = null;
    registryOutageAnswering($page);
    registryOutageLookUp();

    $page = nationalProfessionalSearchFixture($fixture);
    $this->artisan('professionals:probe-registry')
        ->expectsOutput('El registro respondió, pero no «sin resultados»: NATIONAL_PROFESSIONAL_SEARCH_PROBE_DOCUMENT tiene que ser un DNI que nadie tenga.')
        ->assertFailed();

    expect(app(ProfessionalRegistryOutage::class)->ongoing())->toBeFalse();
})->with(['results.html', 'invalid-document.html']);

test('the fake registry is neither probed nor tracked', function () {
    config(['services.professional_registry.adapter' => 'fake']);

    $this->artisan('professionals:probe-registry')->assertSuccessful();

    Http::assertNothingSent();
    Mail::assertNothingOutgoing();
    expect(app(ProfessionalRegistryOutage::class)->ongoing())->toBeFalse();
});

test('the probe runs hourly, and every 5 minutes during an outage', function () {
    $probe = collect(app(Schedule::class)->events())
        ->first(fn (Event $event): bool => str_contains((string) $event->command, 'professionals:probe-registry'));
    $due = fn (string $at): bool => $this->travelTo(CarbonImmutable::parse($at, 'UTC'), fn (): bool => $probe->isDue(app()) && $probe->filtersPass(app()));

    expect($due('2026-11-08 14:00:00'))->toBeTrue()
        ->and($due('2026-11-08 14:05:00'))->toBeFalse()
        ->and($due('2026-11-08 14:07:00'))->toBeFalse();

    $page = null;
    registryOutageAnswering($page);
    registryOutageLookUp();

    expect($due('2026-11-08 14:05:00'))->toBeTrue()
        ->and($due('2026-11-08 14:07:00'))->toBeFalse();
});
