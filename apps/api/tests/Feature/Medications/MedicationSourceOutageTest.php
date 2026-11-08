<?php

declare(strict_types=1);

use App\Actions\Medications\FillMedicationCatalogAction;
use App\Data\Medications\MedicationSearchData;
use App\Enums\ExternalSource;
use App\Exceptions\Medications\MedicationSourceUnavailableException;
use App\Mail\ExternalSources\ExternalSourceOutageMail;
use App\Mail\ExternalSources\ExternalSourceRecoveredMail;
use App\Services\Medications\NationalMedicationSearchService;
use App\Support\ExternalSourceOutage;
use Carbon\CarbonImmutable;
use Illuminate\Console\Scheduling\Event;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

const MEDICATION_OUTAGE_SEARCHED_TERM = 'migral';

const MEDICATION_OUTAGE_PROBE_TERM = 'amoxicilina';

const MEDICATION_OUTAGE_TEAM_ADDRESS = 'equipo@clini.test';

/**
 * What the source answers: a body, or null for a 500.
 */
function medicationOutageAnswering(?string &$body): void
{
    Http::fake(['cnpm.msal.gov.ar/api/vademecum' => function () use (&$body) {
        return $body === null ? Http::response('', 500) : Http::response($body);
    }]);
}

function medicationOutage(): ExternalSourceOutage
{
    return new ExternalSourceOutage(ExternalSource::MedicationSearch);
}

function medicationOutageSearch(): void
{
    try {
        app(NationalMedicationSearchService::class)->search(MEDICATION_OUTAGE_SEARCHED_TERM);
    } catch (MedicationSourceUnavailableException) {
        // A failure, which the outage records.
    }
}

beforeEach(function () {
    Http::preventStrayRequests();
    Mail::fake();
    config([
        'services.national_medication_search.enabled' => true,
        'services.national_medication_search.url' => 'https://cnpm.msal.gov.ar',
        'services.national_medication_search.outage_alert_minutes' => 15,
        'services.national_medication_search.probe_term' => MEDICATION_OUTAGE_PROBE_TERM,
        'contact.notification_email' => MEDICATION_OUTAGE_TEAM_ADDRESS,
    ]);
    $this->travelTo(CarbonImmutable::parse('2026-11-08 13:00:00', 'UTC'));
});

afterEach(function () {
    $this->travelBack();
});

test('the first failure starts the outage and a later one doesn\'t move its start', function () {
    $body = null;
    medicationOutageAnswering($body);

    expect(medicationOutage()->ongoing())->toBeFalse();

    medicationOutageSearch();
    expect(medicationOutage()->ongoing())->toBeTrue();

    // A failure 10 minutes in would mail 15 minutes later if it had restarted the outage.
    $this->travel(10)->minutes();
    medicationOutageSearch();
    $this->travel(5)->minutes();
    medicationOutageSearch();

    Mail::assertQueued(ExternalSourceOutageMail::class, fn (ExternalSourceOutageMail $mail): bool => $mail->source === ExternalSource::MedicationSearch
        && $mail->startedAt->equalTo(CarbonImmutable::parse('2026-11-08 13:00:00', 'UTC')));
});

test('the pause doesn\'t change', function () {
    $body = null;
    medicationOutageAnswering($body);
    $service = app(NationalMedicationSearchService::class);

    medicationOutageSearch();
    expect($service->available())->toBeFalse();

    $this->travel(5)->minutes();
    expect($service->available())->toBeTrue()
        ->and(medicationOutage()->ongoing())->toBeTrue();
});

test('nobody is told before the outage reaches the threshold', function () {
    $body = null;
    medicationOutageAnswering($body);

    medicationOutageSearch();
    $this->travel(14)->minutes();
    medicationOutageSearch();

    Mail::assertNothingOutgoing();
});

test('the threshold is the configured one', function () {
    config(['services.national_medication_search.outage_alert_minutes' => 30]);
    $body = null;
    medicationOutageAnswering($body);

    medicationOutageSearch();
    $this->travel(15)->minutes();
    medicationOutageSearch();
    Mail::assertNothingOutgoing();

    $this->travel(15)->minutes();
    medicationOutageSearch();
    Mail::assertQueuedCount(1);
});

test('the team is told once per outage, at the contact form\'s address, with its start and last step', function () {
    $body = null;
    medicationOutageAnswering($body);

    medicationOutageSearch();
    $this->travel(15)->minutes();
    $body = '<html>otra cosa</html>';
    medicationOutageSearch();
    $this->travel(5)->minutes();
    medicationOutageSearch();

    Mail::assertQueuedCount(1);
    Mail::assertQueued(ExternalSourceOutageMail::class, function (ExternalSourceOutageMail $mail): bool {
        // 13:00 UTC, in Argentina's time.
        $mail->assertSeeInHtml('Buscador Nacional de Medicamentos')
            ->assertSeeInHtml('08/11/2026 10:00')
            ->assertSeeInHtml('puede haber cambiado su formato')
            ->assertSeeInHtml('la búsqueda de medicamentos solo sugiere lo que el catálogo de Clini ya tiene');

        return $mail->hasTo(MEDICATION_OUTAGE_TEAM_ADDRESS)
            && $mail->envelope()->subject === 'El buscador nacional de medicamentos no responde'
            && $mail->step === 'response'
            && $mail->startedAt->equalTo(CarbonImmutable::parse('2026-11-08 13:00:00', 'UTC'));
    });
});

test('an answer the adapter reads ends the outage, and tells the team how long it lasted', function (string $answer) {
    $body = null;
    medicationOutageAnswering($body);

    medicationOutageSearch();
    $this->travel(15)->minutes();
    medicationOutageSearch();
    $this->travel(70)->minutes();
    $body = $answer;
    medicationOutageSearch();

    expect(medicationOutage()->ongoing())->toBeFalse();
    Mail::assertQueued(ExternalSourceRecoveredMail::class, function (ExternalSourceRecoveredMail $mail): bool {
        $mail->assertSeeInHtml('1 h 25 min')
            ->assertSeeInHtml('08/11/2026 10:00')
            ->assertSeeInHtml('08/11/2026 11:25')
            ->assertSeeInHtml('La búsqueda de medicamentos vuelve a sumar al catálogo');

        return $mail->hasTo(MEDICATION_OUTAGE_TEAM_ADDRESS)
            && $mail->envelope()->subject === 'El buscador nacional de medicamentos volvió a responder';
    });

    // The next outage is a new one, told again.
    $body = null;
    medicationOutageSearch();
    $this->travel(15)->minutes();
    medicationOutageSearch();
    Mail::assertQueued(ExternalSourceOutageMail::class, 2);
})->with([
    'products' => [fn (): string => nationalMedicationSearchFixture('migral.json')],
    'nothing found' => ['[]'],
]);

test('an outage nobody was told of ends without a mail', function () {
    $body = null;
    medicationOutageAnswering($body);

    medicationOutageSearch();
    $this->travel(5)->minutes();
    $body = '[]';
    medicationOutageSearch();

    expect(medicationOutage()->ongoing())->toBeFalse();
    Mail::assertNothingOutgoing();
});

test('without the contact form\'s address nobody is mailed', function () {
    config(['contact.notification_email' => null]);
    $body = null;
    medicationOutageAnswering($body);

    medicationOutageSearch();
    $this->travel(15)->minutes();
    medicationOutageSearch();
    $body = '[]';
    medicationOutageSearch();

    expect(medicationOutage()->ongoing())->toBeFalse();
    Mail::assertNothingOutgoing();
});

test('neither the mails nor the logs carry a term: the one searched nor the probe\'s', function () {
    Log::spy();
    $body = null;
    medicationOutageAnswering($body);
    $fill = app(FillMedicationCatalogAction::class);

    $fill->handle(new MedicationSearchData(MEDICATION_OUTAGE_SEARCHED_TERM));
    $this->travel(15)->minutes();
    $this->artisan('medications:probe-source')->assertFailed();
    $body = nationalMedicationSearchFixture('migral.json');
    $this->artisan('medications:probe-source')->assertSuccessful();

    Mail::assertQueuedCount(2);
    foreach ([...Mail::queued(ExternalSourceOutageMail::class), ...Mail::queued(ExternalSourceRecoveredMail::class)] as $mail) {
        foreach ([MEDICATION_OUTAGE_SEARCHED_TERM, MEDICATION_OUTAGE_PROBE_TERM] as $term) {
            $mail->assertDontSeeInHtml($term)->assertDontSeeInText($term);
            expect(mb_strtolower($mail->envelope()->subject))->not->toContain($term);
        }
    }

    Log::shouldHaveReceived('warning')->withArgs(fn (string $message, array $context): bool => $context === ['step' => 'status']
        && ! str_contains(mb_strtolower($message), MEDICATION_OUTAGE_SEARCHED_TERM));
});

test('the probe searches its term even while the source is paused, and its products end the outage', function () {
    $body = null;
    medicationOutageAnswering($body);
    medicationOutageSearch();
    $this->travel(15)->minutes();
    medicationOutageSearch();
    expect(app(NationalMedicationSearchService::class)->available())->toBeFalse();

    $body = nationalMedicationSearchFixture('migral.json');
    $this->travel(1)->minutes();
    $this->artisan('medications:probe-source')
        ->expectsOutput('El buscador respondió 9 productos para el término de prueba.')
        ->assertSuccessful();

    Http::assertSent(fn (Request $request): bool => $request->data() === ['searchdata' => MEDICATION_OUTAGE_PROBE_TERM]);
    expect(medicationOutage()->ongoing())->toBeFalse();
    Mail::assertQueued(ExternalSourceRecoveredMail::class);
});

test('a failed probe starts the outage, and tells the team once it reaches the threshold', function () {
    $body = null;
    medicationOutageAnswering($body);

    $this->artisan('medications:probe-source')
        ->expectsOutput('El buscador no respondió (status).')
        ->assertFailed();
    expect(medicationOutage()->ongoing())->toBeTrue();
    Mail::assertNothingOutgoing();

    $this->travel(15)->minutes();
    $this->artisan('medications:probe-source')->assertFailed();
    Mail::assertQueued(ExternalSourceOutageMail::class, fn (ExternalSourceOutageMail $mail): bool => $mail->step === 'status');
});

test('a probe answered without a valid product fails, and only products end the outage it starts', function (string $answer) {
    $body = $answer;
    medicationOutageAnswering($body);

    $this->artisan('medications:probe-source')
        ->expectsOutput('El buscador respondió algo que no se puede leer o ningún producto para el término de prueba (response).')
        ->assertFailed();
    expect(medicationOutage()->ongoing())->toBeTrue()
        ->and(app(NationalMedicationSearchService::class)->available())->toBeFalse();

    // A search that finds nothing doesn't prove products read again.
    $this->travel(5)->minutes();
    $body = '[]';
    medicationOutageSearch();
    expect(medicationOutage()->ongoing())->toBeTrue();

    // So the next failure past the threshold tells the team, with the probe's step.
    $this->travel(10)->minutes();
    $this->artisan('medications:probe-source')->assertFailed();
    Mail::assertQueued(ExternalSourceOutageMail::class, fn (ExternalSourceOutageMail $mail): bool => $mail->step === 'response');

    $body = nationalMedicationSearchFixture('migral.json');
    medicationOutageSearch();
    expect(medicationOutage()->ongoing())->toBeFalse();
    Mail::assertQueued(ExternalSourceRecoveredMail::class);
})->with([
    'an empty list' => ['[]'],
    // A new format whose rows this adapter can't read.
    'rows without a GTIN' => ['[{"PRODUCTO": "TRIFAMOX 500", "CODIGO": "7795378001089"}]'],
]);

test('with the source off nothing is probed nor tracked', function () {
    config(['services.national_medication_search.enabled' => false]);

    $this->artisan('medications:probe-source')
        ->expectsOutput('El buscador de medicamentos está apagado: no hay nada que probar.')
        ->assertSuccessful();

    Http::assertNothingSent();
    Mail::assertNothingOutgoing();
    expect(medicationOutage()->ongoing())->toBeFalse();
});

test('the probe runs hourly, and every 5 minutes during an outage, only with the source on', function () {
    $probe = collect(app(Schedule::class)->events())
        ->first(fn (Event $event): bool => str_contains((string) $event->command, 'medications:probe-source'));
    $due = fn (string $at): bool => $this->travelTo(CarbonImmutable::parse($at, 'UTC'), fn (): bool => $probe->isDue(app()) && $probe->filtersPass(app()));

    expect($due('2026-11-08 14:00:00'))->toBeTrue()
        ->and($due('2026-11-08 14:05:00'))->toBeFalse()
        ->and($due('2026-11-08 14:07:00'))->toBeFalse();

    $body = null;
    medicationOutageAnswering($body);
    medicationOutageSearch();

    expect($due('2026-11-08 14:05:00'))->toBeTrue()
        ->and($due('2026-11-08 14:07:00'))->toBeFalse();

    config(['services.national_medication_search.enabled' => false]);
    expect($due('2026-11-08 14:00:00'))->toBeFalse()
        ->and($due('2026-11-08 14:05:00'))->toBeFalse();
});
