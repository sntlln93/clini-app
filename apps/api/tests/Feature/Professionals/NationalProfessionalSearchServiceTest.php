<?php

declare(strict_types=1);

use App\Data\Professionals\RegistryLicenseData;
use App\Data\Professionals\RegistryProfessionalData;
use App\Enums\Province;
use App\Exceptions\Professionals\ProfessionalRegistryUnavailableException;
use App\Services\Professionals\NationalProfessionalSearchService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

const NATIONAL_PROFESSIONAL_SEARCH_URL = 'https://www.argentina.gob.ar/salud/buscador-nacional-de-profesionales-de-la-salud';

beforeEach(function () {
    Http::preventStrayRequests();
});

afterEach(function () {
    $this->travelBack();
});

test('a lookup reads the form, posts only the DNI to it, as Clini, and reads every license of the answer', function () {
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $professionals = app(NationalProfessionalSearchService::class)->lookUp('30123456');

    Http::assertSentCount(2);
    Http::assertSentInOrder([
        fn (Request $request) => $request->method() === 'GET'
            && $request->url() === NATIONAL_PROFESSIONAL_SEARCH_URL
            && $request->hasHeader('User-Agent', 'Clini/test'),
        // The form_build_id is the registry form's own, not the site search's that comes first on the page.
        fn (Request $request) => $request->method() === 'POST'
            && $request->url() === NATIONAL_PROFESSIONAL_SEARCH_URL
            && $request->isForm()
            && $request->data() === [
                'searchBy' => 'dni',
                'dni' => '30123456',
                'matricula' => '',
                'apellidonombre' => '',
                'form_build_id' => 'form-dINKOjM6cc3XaBVT8zNLwzzJfETHFHNelypvX6BdRnM',
                'form_id' => 'argobar_consulta_refeps_profesionales',
                'op' => 'Consultar',
                'tarro_de_miel' => '',
            ]
            && $request->hasHeader('User-Agent', 'Clini/test'),
    ]);

    expect($professionals)->toEqual([new RegistryProfessionalData(
        refepsCode: '541030123456',
        active: true,
        licenses: [
            new RegistryLicenseData('123456', Province::CiudadAutonomaDeBuenosAires, 'Médico', 'Medicina General y/o Medicina de Familia', 'MINISTERIO DE SALUD DE LA NACION', 'Habilitado', false),
            new RegistryLicenseData('MP 6789', Province::Cordoba, 'Médico', 'Medicina General y/o Medicina de Familia', 'MEDICOS DE LA PROVINCIA DE CORDOBA, Consejo de', 'Habilitado', false),
            new RegistryLicenseData('4321', Province::BuenosAires, 'Odontólogo', null, 'ODONTOLOGOS DISTRITO I, Colegio de', 'Habilitado', false),
        ],
    )]);
});

test('what the registry answers about the person beyond their licenses never reaches Clini', function () {
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('results.html'));

    $answer = json_encode(array_map(fn (RegistryProfessionalData $professional) => $professional->toArray(), app(NationalProfessionalSearchService::class)->lookUp('30123456')));

    expect($answer)->not->toContain('PRUEBA')
        ->not->toContain('ANA LAURA')
        ->not->toContain('27301234565');
});

test('a page saying it found nobody is an empty answer, not a failure', function () {
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('no-results.html'));
    $service = app(NationalProfessionalSearchService::class);

    expect($service->lookUp('30123456'))->toBe([])
        ->and($service->available())->toBeTrue();
});

test('only a DNI row with exactly the document looked up counts', function () {
    $other = nationalProfessionalSearchItem(documentNumber: '30123457');
    $passport = [...nationalProfessionalSearchItem(), 'tipoDoc' => 'PAS'];
    $leadingZero = nationalProfessionalSearchItem(documentNumber: '030123456');
    fakeNationalProfessionalSearch(nationalProfessionalSearchResults([$other, $passport, $leadingZero]));

    expect(app(NationalProfessionalSearchService::class)->lookUp('30123456'))->toHaveCount(1);
});

test('a malformed license or profession is skipped, not the whole answer', function () {
    $item = nationalProfessionalSearchItem([['Médico', '123456', 'CABA']]);
    $item['profesiones'][] = 'not a profession';
    $item['profesiones'][] = ['profesionReferencia' => null, 'matriculas' => [['matricula' => '1', 'provinciaMatricula' => 'CABA']]];
    $item['profesiones'][0]['matriculas'][] = ['matricula' => '', 'provinciaMatricula' => 'CABA'];
    $item['profesiones'][0]['matriculas'][] = ['matricula' => '777', 'provinciaMatricula' => 'Marte'];
    fakeNationalProfessionalSearch(nationalProfessionalSearchResults([$item]));

    $licenses = app(NationalProfessionalSearchService::class)->lookUp('30123456')[0]->licenses;

    // A province Clini doesn't know is kept without one, so it never matches a declared license.
    expect(array_map(fn (RegistryLicenseData $license) => [$license->number, $license->province], $licenses))
        ->toBe([['123456', Province::CiudadAutonomaDeBuenosAires], ['777', null]]);
});

test('a sanction runs until its end date, and one without a readable end date counts as running', function (?string $end, bool $sanctioned) {
    $this->travelTo('2026-11-01 12:00:00');
    fakeNationalProfessionalSearch(nationalProfessionalSearchResults([nationalProfessionalSearchItem([['Médico', '123456', 'CABA', 'Habilitado', $end]])]));

    expect(app(NationalProfessionalSearchService::class)->lookUp('30123456')[0]->licenses[0]->sanctioned)->toBe($sanctioned);
})->with([
    'none' => [null, false],
    'ended' => ['2026-10-31', false],
    'ends today' => ['2026-11-01', true],
    'running, ISO' => ['2027-01-15T00:00:00', true],
    'running, d/m/Y' => ['15/01/2027', true],
    'unreadable' => ['pronto', true],
    'impossible date' => ['2027-02-30', true],
]);

test('an error, a timeout or a page it can\'t read fails and pauses the registry', function (string $failure) {
    config([
        'services.national_professional_search.enabled' => true,
        'services.national_professional_search.url' => NATIONAL_PROFESSIONAL_SEARCH_URL,
        'services.national_professional_search.user_agent' => 'Clini/test',
    ]);
    $form = Http::response(nationalProfessionalSearchFixture('form.html'));
    Http::fake(['www.argentina.gob.ar/*' => fn (Request $request) => match ($failure) {
        'form unreachable' => throw new ConnectionException('cURL error 28: Operation timed out'),
        'form error' => Http::response('Service Unavailable', 503),
        'form missing' => Http::response('<html>Mantenimiento</html>'),
        'search timeout' => $request->method() === 'GET' ? $form : throw new ConnectionException('cURL error 28: Operation timed out'),
        'search error' => $request->method() === 'GET' ? $form : Http::response('Bad Gateway', 502),
        'unknown page' => $request->method() === 'GET' ? $form : Http::response(nationalProfessionalSearchFixture('form.html')),
        'broken json' => $request->method() === 'GET' ? $form : Http::response(str_replace('"codigo"', 'codigo', nationalProfessionalSearchFixture('results.html'))),
    }]);
    $service = app(NationalProfessionalSearchService::class);

    expect($service->available())->toBeTrue()
        ->and(fn () => $service->lookUp('30123456'))->toThrow(ProfessionalRegistryUnavailableException::class)
        ->and($service->available())->toBeFalse();
})->with(['form unreachable', 'form error', 'form missing', 'search timeout', 'search error', 'unknown page', 'broken json']);

test('a DNI the form won\'t search is an empty answer about that DNI, and never pauses the registry for everyone', function () {
    fakeNationalProfessionalSearch(nationalProfessionalSearchFixture('invalid-document.html'));
    $service = app(NationalProfessionalSearchService::class);

    expect($service->lookUp('30123456'))->toBe([])
        ->and($service->available())->toBeTrue();
});

test('any other form error is a failure, not an empty answer', function () {
    fakeNationalProfessionalSearch(str_replace('El DNI ingresado no es válido', 'El formulario venció', nationalProfessionalSearchFixture('invalid-document.html')));

    expect(fn () => app(NationalProfessionalSearchService::class)->lookUp('30123456'))
        ->toThrow(ProfessionalRegistryUnavailableException::class);
});

test('a failure never logs the DNI looked up', function () {
    expect((new ProfessionalRegistryUnavailableException('response'))->logContext())->toBe(['step' => 'response']);
});

test('it is off unless turned on', function () {
    config(['services.national_professional_search.enabled' => false]);

    expect(app(NationalProfessionalSearchService::class)->available())->toBeFalse();
});
