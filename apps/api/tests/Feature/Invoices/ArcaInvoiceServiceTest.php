<?php

declare(strict_types=1);

use App\Data\Invoices\AuthorizedVoucherData;
use App\Data\Invoices\VoucherRequestData;
use App\Enums\InvoiceEnvironment;
use App\Enums\InvoiceVoucherType;
use App\Exceptions\Invoices\InvoiceIssuerUnavailableException;
use App\Exceptions\Invoices\InvoiceVoucherRejectedException;
use App\Services\Invoicing\ArcaInvoiceService;
use App\Support\ArcaSoap;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    configureArca();
    Date::setTestNow('2026-10-03 13:00:00');
});

afterEach(function () {
    Date::setTestNow();
});

function arcaVoucher(int $number = 2, int $amountCents = 1500000): VoucherRequestData
{
    return new VoucherRequestData(
        pointOfSale: 1,
        type: InvoiceVoucherType::FacturaC,
        number: $number,
        issuedOn: CarbonImmutable::parse('2026-10-03'),
        amountCents: $amountCents,
        serviceFrom: CarbonImmutable::parse('2026-10-03'),
        serviceTo: CarbonImmutable::parse('2026-11-02'),
        paymentDueOn: CarbonImmutable::parse('2026-10-03'),
    );
}

/**
 * The `in0` a loginCms request carried: the TRA signed as a CMS.
 */
function signedLoginRequest(Request $request): string
{
    $xpath = ArcaSoap::parse($request->body());

    return base64_decode((string) ArcaSoap::text($xpath, 'loginCms/in0'), true) ?: '';
}

function wsfeRequest(string $operation): ?Request
{
    return Http::recorded(fn (Request $request) => ($request->header('SOAPAction')[0] ?? '') === '"http://ar.gov.afip.dif.FEV1/'.$operation.'"')
        ->first()[0] ?? null;
}

test('the last authorized number is read from FECompUltimoAutorizado', function () {
    fakeArca(['FECompUltimoAutorizado' => 'FECompUltimoAutorizado.xml']);

    expect(app(ArcaInvoiceService::class)->lastAuthorizedNumber(1, InvoiceVoucherType::FacturaC))->toBe(1);

    $request = wsfeRequest('FECompUltimoAutorizado');
    expect($request->url())->toBe('https://wswhomo.afip.gov.ar/wsfev1/service.asmx')
        ->and($request->header('Content-Type')[0])->toBe('text/xml; charset=utf-8')
        ->and($request->body())->toContain('<ar:Token>PD94bWwgdmVyc2lvbj0iMS4wIj8+dG9rZW4tZGUtcHJ1ZWJh</ar:Token>')
        ->and($request->body())->toContain('<ar:Sign>c2lnbi1kZS1wcnVlYmEtZGUtY2xpbmk=</ar:Sign>')
        ->and($request->body())->toContain('<ar:Cuit>20111111112</ar:Cuit>')
        ->and($request->body())->toContain('<ar:PtoVta>1</ar:PtoVta><ar:CbteTipo>11</ar:CbteTipo>');
});

test('the access request is a CMS that carries the TRA for wsfe, signed with the configured certificate', function () {
    fakeArca(['FECompUltimoAutorizado' => 'FECompUltimoAutorizado.xml']);

    app(ArcaInvoiceService::class)->lastAuthorizedNumber(1, InvoiceVoucherType::FacturaC);

    $login = Http::recorded(fn (Request $request) => str_contains($request->url(), 'LoginCms'))->first()[0];
    expect($login->url())->toBe('https://wsaahomo.afip.gov.ar/ws/services/LoginCms')
        ->and($login->body())->toContain('xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov"');

    $directory = sys_get_temp_dir().'/arca-test-'.bin2hex(random_bytes(8));
    mkdir($directory);
    file_put_contents("{$directory}/cms.der", signedLoginRequest($login));

    try {
        $verified = openssl_cms_verify("{$directory}/cms.der", OPENSSL_CMS_NOVERIFY, "{$directory}/signer.pem", [], null, "{$directory}/tra.xml", null, null, OPENSSL_ENCODING_DER);
        $tra = (string) file_get_contents("{$directory}/tra.xml");
        $signer = openssl_x509_parse((string) file_get_contents("{$directory}/signer.pem"));
    } finally {
        array_map('unlink', glob("{$directory}/*") ?: []);
        rmdir($directory);
    }

    expect($verified)->toBeTrue()
        ->and($signer['subject']['CN'])->toBe('clini-test')
        ->and($tra)->toContain('<loginTicketRequest version="1.0">')
        ->and($tra)->toContain('<service>wsfe</service>')
        // Ten minutes around now, so a clock behind ARCA's never dates it in the future.
        ->and($tra)->toContain('<generationTime>2026-10-03T12:50:00+00:00</generationTime>')
        ->and($tra)->toContain('<expirationTime>2026-10-03T13:10:00+00:00</expirationTime>');
});

test('the access ticket is reused while valid and stored encrypted', function () {
    fakeArca(['FECompUltimoAutorizado' => 'FECompUltimoAutorizado.xml']);
    $service = app(ArcaInvoiceService::class);

    $service->lastAuthorizedNumber(1, InvoiceVoucherType::FacturaC);
    Date::setTestNow('2026-10-04 00:30:00'); // 21:30 in Argentina: twenty minutes before the ticket expires.
    $service->lastAuthorizedNumber(1, InvoiceVoucherType::FacturaC);

    expect(Http::recorded(fn (Request $request) => str_contains($request->url(), 'LoginCms')))->toHaveCount(1)
        ->and(Cache::get('arca:access-ticket:wsfe:homologation:20111111112'))->toBeString()
        ->not->toContain('dG9rZW4tZGUtcHJ1ZWJh');
});

test('the ticket is used until it expires, and only then renewed: WSAA refuses a new one while it is valid', function () {
    fakeArca(['FECompUltimoAutorizado' => 'FECompUltimoAutorizado.xml']);
    $service = app(ArcaInvoiceService::class);
    $logins = fn () => Http::recorded(fn (Request $request) => str_contains($request->url(), 'LoginCms'));

    $service->lastAuthorizedNumber(1, InvoiceVoucherType::FacturaC);
    Date::setTestNow('2026-10-04 00:49:00'); // A minute left: still valid at WSAA.
    $service->lastAuthorizedNumber(1, InvoiceVoucherType::FacturaC);

    expect($logins())->toHaveCount(1);

    Date::setTestNow('2026-10-04 00:50:00'); // Within the clock skew of its 00:50:00.512 expiration.
    $service->lastAuthorizedNumber(1, InvoiceVoucherType::FacturaC);

    expect($logins())->toHaveCount(2);
});

test('WSAA refusing a ticket while another is valid is reported as unavailable, with its fault code', function () {
    fakeArca(['FECompUltimoAutorizado' => 'FECompUltimoAutorizado.xml'], login: 'loginCms-already-authenticated.xml');

    expect(fn () => app(ArcaInvoiceService::class)->lastAuthorizedNumber(1, InvoiceVoucherType::FacturaC))
        ->toThrow(function (InvoiceIssuerUnavailableException $exception) {
            expect($exception->step)->toBe('loginCms')
                ->and($exception->providerCode)->toBe('coe.alreadyAuthenticated')
                ->and($exception->providerMessage)->toContain('ya posee un TA valido');
        });

    Http::assertSentCount(1);
});

test('a voucher is requested as a factura C for services to a final consumer, in pesos and without VAT', function () {
    fakeArca(['FECAESolicitar' => 'FECAESolicitar-approved.xml']);

    $authorized = app(ArcaInvoiceService::class)->authorize(arcaVoucher(2, amountCents: 1500050));

    expect($authorized)->toEqual(new AuthorizedVoucherData(
        number: 2,
        cae: '86451064433459',
        caeExpiresOn: CarbonImmutable::parse('2026-11-18'),
        issuedOn: CarbonImmutable::parse('2026-11-08'),
        amountCents: 1500050,
    ));

    $body = wsfeRequest('FECAESolicitar')->body();
    expect($body)->toContain('<ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>1</ar:PtoVta><ar:CbteTipo>11</ar:CbteTipo></ar:FeCabReq>')
        ->and($body)->toContain('<ar:Concepto>2</ar:Concepto><ar:DocTipo>99</ar:DocTipo><ar:DocNro>0</ar:DocNro>')
        ->and($body)->toContain('<ar:CbteDesde>2</ar:CbteDesde><ar:CbteHasta>2</ar:CbteHasta><ar:CbteFch>20261003</ar:CbteFch>')
        ->and($body)->toContain('<ar:ImpTotal>15000.50</ar:ImpTotal><ar:ImpTotConc>0</ar:ImpTotConc><ar:ImpNeto>15000.50</ar:ImpNeto>')
        ->and($body)->toContain('<ar:ImpOpEx>0</ar:ImpOpEx><ar:ImpTrib>0</ar:ImpTrib><ar:ImpIVA>0</ar:ImpIVA>')
        ->and($body)->toContain('<ar:FchServDesde>20261003</ar:FchServDesde><ar:FchServHasta>20261102</ar:FchServHasta><ar:FchVtoPago>20261003</ar:FchVtoPago>')
        ->and($body)->toContain('<ar:MonId>PES</ar:MonId><ar:MonCotiz>1</ar:MonCotiz>')
        ->and($body)->toContain('<ar:CondicionIVAReceptorId>5</ar:CondicionIVAReceptorId>')
        ->and($body)->not->toContain('<ar:Iva>')
        ->and($body)->not->toContain('CanMisMonExt');
});

test('an authorization for another number than the one asked for is not taken as this voucher\'s', function () {
    fakeArca(['FECAESolicitar' => 'FECAESolicitar-approved.xml']);

    expect(fn () => app(ArcaInvoiceService::class)->authorize(arcaVoucher(3)))
        ->toThrow(fn (InvoiceIssuerUnavailableException $exception) => expect($exception->providerCode)->toBe('unexpected_number'));
});

test('a rejected voucher throws with its observations', function () {
    fakeArca(['FECAESolicitar' => 'FECAESolicitar-rejected.xml']);

    // A skipped number: ARCA answers 10016 in the result's errors, not in the detail's observations.
    expect(fn () => app(ArcaInvoiceService::class)->authorize(arcaVoucher(6)))
        ->toThrow(function (InvoiceVoucherRejectedException $exception) {
            expect($exception->number)->toBe(6)
                ->and($exception->observations)->toHaveCount(1)
                ->and($exception->observations[0])->toStartWith('10016: El numero o fecha del comprobante');
        });
});

test('a token WSFEv1 no longer takes is dropped, so the next call asks WSAA again', function () {
    fakeArca(['FECAESolicitar' => 'FECAESolicitar-invalid-ticket.xml', 'FECompUltimoAutorizado' => 'FECompUltimoAutorizado.xml']);
    $service = app(ArcaInvoiceService::class);

    expect(fn () => $service->authorize(arcaVoucher()))
        ->toThrow(fn (InvoiceIssuerUnavailableException $exception) => expect($exception->providerCode)->toBe('600'));

    $service->lastAuthorizedNumber(1, InvoiceVoucherType::FacturaC);

    expect(Http::recorded(fn (Request $request) => str_contains($request->url(), 'LoginCms')))->toHaveCount(2);
});

test('an authorized voucher is found by its number', function () {
    fakeArca(['FECompConsultar' => 'FECompConsultar.xml']);

    expect(app(ArcaInvoiceService::class)->findAuthorized(1, InvoiceVoucherType::FacturaC, 1))->toEqual(new AuthorizedVoucherData(
        number: 1,
        cae: '86451064432343',
        caeExpiresOn: CarbonImmutable::parse('2026-11-18'),
        issuedOn: CarbonImmutable::parse('2026-11-08'),
        amountCents: 1500000,
    ));

    expect(wsfeRequest('FECompConsultar')->body())
        ->toContain('<ar:FeCompConsReq><ar:CbteTipo>11</ar:CbteTipo><ar:CbteNro>1</ar:CbteNro><ar:PtoVta>1</ar:PtoVta></ar:FeCompConsReq>');
});

test('a number never authorized is not found', function () {
    fakeArca(['FECompConsultar' => 'FECompConsultar-not-found.xml']);

    expect(app(ArcaInvoiceService::class)->findAuthorized(1, InvoiceVoucherType::FacturaC, 43))->toBeNull();
});

test('an answer that is not XML, or a network error, is reported as unavailable', function (Closure $response) {
    fakeArca(['FECompUltimoAutorizado' => $response]);

    expect(fn () => app(ArcaInvoiceService::class)->lastAuthorizedNumber(1, InvoiceVoucherType::FacturaC))
        ->toThrow(InvoiceIssuerUnavailableException::class);
})->with([
    'an HTML error page' => [fn () => fn () => Http::response('<html><body>Service Unavailable</body>', 503)],
    'an empty body' => [fn () => fn () => Http::response('', 502)],
    'a timeout' => [fn () => fn () => throw new ConnectionException('timed out')],
]);

test('production points at ARCA\'s production services', function () {
    configureArca('production');
    fakeArca(['FECompUltimoAutorizado' => 'FECompUltimoAutorizado.xml']);
    $service = app(ArcaInvoiceService::class);

    $service->lastAuthorizedNumber(1, InvoiceVoucherType::FacturaC);

    expect($service->environment())->toBe(InvoiceEnvironment::Production);
    Http::assertSent(fn (Request $request) => $request->url() === 'https://wsaa.afip.gov.ar/ws/services/LoginCms');
    Http::assertSent(fn (Request $request) => $request->url() === 'https://servicios1.afip.gov.ar/wsfev1/service.asmx');
});

test('an unknown environment, a missing certificate or a malformed CUIT is a configuration error', function (array $config, string $message) {
    fakeArca(['FECompUltimoAutorizado' => 'FECompUltimoAutorizado.xml']);
    config($config);

    expect(fn () => app(ArcaInvoiceService::class)->lastAuthorizedNumber(1, InvoiceVoucherType::FacturaC))
        ->toThrow(LogicException::class, $message);
})->with([
    'environment' => [['invoicing.arca.environment' => 'sandbox'], 'ARCA_ENVIRONMENT'],
    'certificate' => [['invoicing.arca.certificate' => ''], 'ARCA_CERTIFICATE'],
    'CUIT' => [['invoicing.issuer_data.cuit' => '20-11111111-2'], 'INVOICE_ISSUER_CUIT'],
]);
