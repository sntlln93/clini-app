<?php

declare(strict_types=1);

use App\Enums\MedicationSearchField;
use App\Exceptions\Medications\MedicationSourceUnavailableException;
use App\Services\Medications\AnmatVademecumService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'services.anmat_vademecum.enabled' => true,
        'services.anmat_vademecum.url' => 'https://servicios.pami.org.ar/vademecum',
        'services.anmat_vademecum.user_agent' => 'Clini/test',
    ]);
    Http::preventStrayRequests();
});

/**
 * The lookup as recorded: the listing page, then the search and, for a detail, the click and the detail page.
 */
function fakeVademecum(?string $search = null): void
{
    Http::fake([
        'servicios.pami.org.ar/vademecum/views/consultaPublica/listado.zul' => Http::response(vademecumFixture('listado.html')),
        'servicios.pami.org.ar/vademecum/zkau*' => Http::sequence()
            ->push($search ?? vademecumFixture('busqueda.txt'))
            ->push(vademecumFixture('redireccion.json')),
        'servicios.pami.org.ar/vademecum/views/consultaPublica/presentacion.zul' => Http::response(vademecumFixture('presentacion.html')),
    ]);
}

test('a search opens a session and sends the events a browser would, as Clini', function () {
    fakeVademecum();

    $listed = app(AnmatVademecumService::class)->search(MedicationSearchField::Commercial, 'migral');

    expect(array_map(fn ($listing) => $listing->gtin, $listed))->toBe(['07795378001096', '07795378001058']);
    Http::assertSentCount(2);
    Http::assertSent(fn (Request $request) => $request->method() === 'GET'
        && $request->url() === 'https://servicios.pami.org.ar/vademecum/views/consultaPublica/listado.zul'
        && $request->hasHeader('User-Agent', 'Clini/test'));
    Http::assertSent(fn (Request $request) => $request->method() === 'POST'
        && $request->url() === 'https://servicios.pami.org.ar/vademecum/zkau;jsessionid=BB587BE36C0C6B60F21268702D5F57B0'
        && $request->header('ZK-SID') === ['1']
        && $request->data() === [
            'dtid' => 'z_1y40',
            'cmd_0' => 'onChange',
            'uuid_0' => 'zk_comp_34',
            'data_0' => '{"value":"migral","start":6}',
            'cmd_1' => 'onClick',
            'uuid_1' => 'zk_comp_80',
            'data_1' => '{"pageX":0,"pageY":0,"which":1,"x":0,"y":0}',
        ]);
});

test('a generic search fills the generic name input', function () {
    fakeVademecum();

    app(AnmatVademecumService::class)->search(MedicationSearchField::Generic, 'dipirona');

    Http::assertSent(fn (Request $request) => $request->method() === 'POST' && ($request->data()['uuid_0'] ?? null) === 'zk_comp_28');
});

test('a detail replays the search, clicks the product\'s row and reads the page it is sent to', function () {
    fakeVademecum();

    $detail = app(AnmatVademecumService::class)->detail(MedicationSearchField::Commercial, 'migral', '07795378001096');

    expect($detail?->ingredients)->toHaveCount(3)
        ->and($detail?->dispensingCondition)->toBe('BAJO RECETA');
    // Exactly the next sequence: ZK answers a repeated one with its previous response, never the click.
    Http::assertSent(fn (Request $request) => $request->method() === 'POST'
        && $request->header('ZK-SID') === ['2']
        && $request->data() === ['dtid' => 'z_1y40', 'cmd_0' => 'onClick', 'uuid_0' => 'zk_comp_327', 'data_0' => '{"pageX":0,"pageY":0,"which":1,"x":0,"y":0}']);
    Http::assertSent(fn (Request $request) => $request->url() === 'https://servicios.pami.org.ar/vademecum/views/consultaPublica/presentacion.zul');
});

test('a product the search no longer lists has no detail, and nothing is clicked', function () {
    fakeVademecum();

    expect(app(AnmatVademecumService::class)->detail(MedicationSearchField::Commercial, 'migral', '07790000000000'))->toBeNull();
    Http::assertSentCount(2);
});

test('a detail that fails fails only that pick, not the searches', function () {
    Http::fake([
        'servicios.pami.org.ar/vademecum/views/consultaPublica/listado.zul' => Http::response(vademecumFixture('listado.html')),
        'servicios.pami.org.ar/vademecum/zkau*' => Http::sequence()
            ->push(vademecumFixture('busqueda.txt'))
            ->push(vademecumFixture('busqueda.txt')),
    ]);
    $service = app(AnmatVademecumService::class);

    expect(fn () => $service->detail(MedicationSearchField::Commercial, 'migral', '07795378001096'))->toThrow(MedicationSourceUnavailableException::class)
        ->and($service->available())->toBeTrue();
});

test('a failing lookup is unavailable and stays unasked for a while', function () {
    Http::fake(['servicios.pami.org.ar/*' => Http::failedConnection()]);
    $service = app(AnmatVademecumService::class);

    expect(fn () => $service->search(MedicationSearchField::Commercial, 'migral'))->toThrow(MedicationSourceUnavailableException::class)
        ->and($service->available())->toBeFalse();
});

test('a page whose structure changed is unavailable rather than misread', function () {
    Http::fake(['servicios.pami.org.ar/*' => Http::response('<html>Sitio en mantenimiento</html>')]);

    expect(fn () => app(AnmatVademecumService::class)->search(MedicationSearchField::Commercial, 'migral'))
        ->toThrow(MedicationSourceUnavailableException::class);
});

test('turned off, the lookup is never available', function () {
    config(['services.anmat_vademecum.enabled' => false]);

    expect(app(AnmatVademecumService::class)->available())->toBeFalse();
});
