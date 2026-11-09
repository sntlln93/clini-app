<?php

declare(strict_types=1);

use App\Contracts\MedicationSource;
use App\Data\Medications\MedicationProductData;
use App\Enums\ClinicalAccessAction;
use App\Enums\ClinicalAccessReason;
use App\Exceptions\Medications\MedicationSourceUnavailableException;
use App\Models\Appointment;
use App\Models\ClinicalAccessLog;
use App\Models\ContactRequest;
use App\Models\Membership;
use App\Models\Organization;
use App\Models\PatientAccessCode;
use App\Models\PlatformAdmin;
use App\Models\ProfessionalService;
use App\Models\Service;
use App\Models\Subscription;
use App\Models\User;
use App\Support\CurrentOrganization;
use App\Support\MedicationComposition;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class)->in('Feature');

/**
 * Mercado Pago test config (tests/Feature/Subscriptions): sandbox-like
 * values only, never real credentials.
 */
function configureMercadoPago(): void
{
    config([
        'services.mercadopago.access_token' => 'TEST-access-token',
        'services.mercadopago.public_key' => 'TEST-public-key',
        'services.mercadopago.webhook_secret' => 'test-webhook-secret',
        'services.mercadopago.back_url' => 'https://api.example.com/api/v1/subscription/return',
        'plans.practice.base_amount' => 15000,
        'plans.practice.included_professionals' => 5,
        'plans.practice.extra_professional_amount' => 5000,
        'plans.practice.annual_discount_percent' => 40,
        'plans.practice.currency' => 'ARS',
    ]);
}

/**
 * Free's appointment limit as #238 shipped it; the config default is no
 * limit (#300), so tests about the limit set it explicitly.
 */
function limitFreePlan(int $limit = 40, int $warningThreshold = 35): void
{
    config([
        'plans.free.monthly_appointment_limit' => $limit,
        'plans.free.appointment_warning_threshold' => $warningThreshold,
    ]);
}

/**
 * Builds an `x-signature` header the way Mercado Pago documents it.
 */
function mercadoPagoSignature(string $dataId, string $requestId, string $ts, string $secret = 'test-webhook-secret'): string
{
    $manifest = 'id:'.strtolower($dataId).';request-id:'.$requestId.';ts:'.$ts.';';

    return 'ts='.$ts.',v1='.hash_hmac('sha256', $manifest, $secret);
}

/**
 * Every platform-operator request must look like it comes from the
 * dashboard: the Referer makes it Sanctum-stateful (session) *and* passes
 * the `admin.origin` pin. Not named `fromSpa` — SanctumSpaAuthTest declares
 * that one globally.
 */
function fromDashboard(): TestCase
{
    /** @var TestCase $test */
    $test = test();

    return $test->withHeader('Referer', 'http://localhost:5175');
}

/**
 * Points the test's default Referer back at the panel, for a clinic request
 * that follows an operator one in the same test: the clinic routes reject
 * the dashboard origin (`clinic.origin`, ADR 0010).
 */
function fromPanel(): TestCase
{
    /** @var TestCase $test */
    $test = test();

    return $test->withHeader('Referer', 'http://localhost:5174');
}

/**
 * `actingAs($admin, 'admin')` also switches the default guard to `admin`.
 */
function actingAsAdmin(?PlatformAdmin $admin = null): TestCase
{
    return fromDashboard()->actingAs($admin ?? PlatformAdmin::factory()->create(), 'admin');
}

/**
 * What a fresh production request starts from, between chained requests of
 * one test: no cached guard users, `web` as the default guard (an earlier
 * `auth:admin` or `actingAs(..., 'admin')` switched it), and no tenant left
 * in the CurrentOrganization singleton by an earlier clinic request. The
 * session store itself is kept, like a browser cookie would keep it.
 */
function freshRequestState(): void
{
    app('auth')->shouldUse('web');
    app('auth')->forgetGuards();
    app(CurrentOrganization::class)->set(null);
}

/**
 * Fills the `{organization}`, `{user}`, `{subscription}` and `{contactRequest}` placeholders of
 * an admin route template (tests/Datasets/AdminRoutes.php) with real ids.
 */
function adminRouteUri(string $template): string
{
    $organization = Organization::factory()->create();
    $subscription = Subscription::factory()->create(['organization_id' => $organization->id]);
    $user = User::factory()->create();
    $contactRequest = ContactRequest::factory()->create();

    return str_replace(
        ['{organization}', '{user}', '{subscription}', '{contactRequest}'],
        [(string) $organization->id, (string) $user->id, (string) $subscription->id, (string) $contactRequest->id],
        $template,
    );
}

/**
 * Public booking slot fixture, shared by the slot and holiday tests. UTC
 * keeps their clock times and plain date/time strings unambiguous —
 * timezone conversion itself is exercised elsewhere
 * (ListAvailableSlotsAction/ComputePublishedScheduleAction).
 *
 * @return array{0: Organization, 1: Membership, 2: Service}
 */
function createSlotsFixture(int $durationMinutes = 30): array
{
    $organization = Organization::factory()->create(['timezone' => 'UTC']);
    $membership = Membership::factory()->create(['organization_id' => $organization->id]);
    $service = Service::factory()->create();
    ProfessionalService::factory()->create([
        'organization_id' => $organization->id,
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'duration_minutes' => $durationMinutes,
        'active' => true,
    ]);

    return [$organization, $membership, $service];
}

function slotsUrl(Organization $organization, Membership $membership, Service $service, string $from, ?string $to = null): string
{
    return '/api/v1/booking/'.$organization->slug.'/slots?'.http_build_query([
        'membership_id' => $membership->id,
        'service_id' => $service->id,
        'from' => $from,
        'to' => $to ?? $from,
    ]);
}

/**
 * @param  array<int, array{start_at: string, end_at: string}>  $slots
 * @return array<int, string>
 */
function slotStartTimes(array $slots): array
{
    return collect($slots)
        ->map(fn (array $slot): string => CarbonImmutable::parse($slot['start_at'])->format('H:i'))
        ->all();
}

/**
 * Opens a patient's clinical history to a membership the way an exceptional access does (#325, ADR 0022), so a test
 * about what the history holds doesn't depend on the appointment factory's random date landing near today.
 */
function openClinicalHistory(Membership $membership, int $patientId): void
{
    ClinicalAccessLog::query()->withoutGlobalScope('organization')->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'patient_id' => $patientId,
        'action' => ClinicalAccessAction::ExceptionalAccess,
        'reason' => ClinicalAccessReason::PreparingConsultation,
    ]);
}

/**
 * Gives a membership what the patient's code opens (#364, ADR 0029), as if the patient shared it and the membership
 * redeemed it: the code of an appointment of theirs with the patient (one today, unless given), redeemed and valid for
 * a week whatever the appointment's date.
 */
function shareAccessCode(Membership $membership, int $patientId, ?Appointment $appointment = null): PatientAccessCode
{
    $appointment ??= Appointment::factory()->create([
        'organization_id' => $membership->organization_id,
        'membership_id' => $membership->id,
        'patient_id' => $patientId,
        'start_at' => now(),
        'end_at' => now()->addMinutes(30),
    ]);

    return PatientAccessCode::query()->withoutGlobalScope('organization')->create([
        'organization_id' => $membership->organization_id,
        'appointment_id' => $appointment->id,
        'patient_id' => $patientId,
        'membership_id' => $membership->id,
        'code' => 'ABCD2345',
        'expires_at' => now()->addDays(7),
        'redeemed_at' => now(),
    ]);
}

/**
 * A response recorded from the national medication search (#377), under tests/Fixtures/NationalMedicationSearch.
 */
function nationalMedicationSearchFixture(string $name): string
{
    return (string) file_get_contents(__DIR__."/Fixtures/NationalMedicationSearch/{$name}");
}

/**
 * A source that answers what it is given and records the terms it was asked.
 *
 * @param  array<string, list<MedicationProductData>>  $answers  by term, as sent
 */
function fakeMedicationSource(array $answers = [], bool $available = true, bool $failing = false): ArrayObject
{
    $calls = new ArrayObject;

    app()->instance(MedicationSource::class, new class($answers, $available, $failing, $calls) implements MedicationSource
    {
        /**
         * @param  array<string, list<MedicationProductData>>  $answers
         */
        public function __construct(
            private array $answers,
            private bool $available,
            private bool $failing,
            private ArrayObject $calls,
        ) {}

        public function available(): bool
        {
            return $this->available;
        }

        public function search(string $term): array
        {
            $this->calls[] = $term;

            if ($this->failing) {
                throw new MedicationSourceUnavailableException('status');
            }

            return $this->answers[$term] ?? [];
        }
    });

    return $calls;
}

function sourceProduct(string $gtin, string $name, string $drug = 'ibuprofeno', array $overrides = []): MedicationProductData
{
    $fields = [
        'gtin' => $gtin,
        'name' => $name,
        'presentation' => 'comp.x 20',
        'pharmaceuticalForm' => 'Comprimidos/Pastillas/Tabletas/Grageas',
        'administrationRoute' => 'oral',
        'laboratory' => 'Montpellier',
        'troquel' => '730152',
        'snomed' => '239671000221103',
        'drug' => $drug,
        'drugCode' => '00378',
        'therapeuticAction' => 'Analgésico Antiinflam.',
        'therapeuticActionCode' => '00056',
        'dispensingCondition' => 'Venta Bajo Receta',
        'controlMark' => null,
        'withdrawn' => false,
        'inForce' => true,
        'updatedOn' => '2026-10-27',
        ...$overrides,
    ];

    return new MedicationProductData(...$fields, composition: MedicationComposition::of($fields['drug']));
}

/**
 * A page recorded from the national professional search (#380), under tests/Fixtures/NationalProfessionalSearch. The
 * results page holds a made-up professional; the others are the registry's own pages.
 */
function nationalProfessionalSearchFixture(string $name): string
{
    return (string) file_get_contents(__DIR__."/Fixtures/NationalProfessionalSearch/{$name}");
}

/**
 * The recorded results page answering with these items instead of its own, escaped the way the registry writes them.
 *
 * @param  list<array<string, mixed>>  $items
 */
function nationalProfessionalSearchResults(array $items): string
{
    $json = str_replace('/', '\/', (string) json_encode($items, JSON_THROW_ON_ERROR));

    return (string) preg_replace_callback(
        '/(refepsProfesionales\.allItems = ).*?;(\s*Drupal\.)/s',
        fn (array $match): string => $match[1].$json.';'.$match[2],
        nationalProfessionalSearchFixture('results.html'),
    );
}

/**
 * The recorded results' professional, DNI 30123456, with every field the registry answers; `$licenses` replaces
 * their licenses as [profession, number, province, situation, sanction end] rows.
 *
 * @param  list<array{0: string, 1: string, 2: string, 3?: string, 4?: string|null}>|null  $licenses
 * @return array<string, mixed>
 */
function nationalProfessionalSearchItem(?array $licenses = null, string $active = 'SI', string $documentNumber = '30123456'): array
{
    $item = json_decode((string) preg_replace('/^.*refepsProfesionales\.allItems = (\[.*?\]);\s*Drupal\..*$/s', '$1', nationalProfessionalSearchFixture('results.html')), true)[0];
    $item['activo'] = $active;
    $item['nroDoc'] = $documentNumber;

    if ($licenses !== null) {
        $item['profesiones'] = array_map(fn (array $license): array => [
            'idProfesionReferencia' => 1,
            'profesionReferencia' => $license[0],
            'refepsEspecialidad' => null,
            'matriculas' => [[
                'matricula' => $license[1],
                'origenEmite' => 'COLEGIO DE PRUEBA',
                'provinciaMatricula' => $license[2],
                'situacionMatricula' => $license[3] ?? 'Habilitado',
                'tipoSancion' => ($license[4] ?? null) === null ? null : 'Suspensión',
                'motivoSancion' => null,
                'fechaFinSancion' => $license[4] ?? null,
            ]],
        ], $licenses);
    }

    return $item;
}

/**
 * The item with this `refepsEspecialidad` on every profession, as the registry writes it.
 *
 * @param  array<string, mixed>  $item
 * @return array<string, mixed>
 */
function withRegistrySpecialty(array $item, ?string $specialty): array
{
    $item['profesiones'] = array_map(fn (array $profession): array => [...$profession, 'refepsEspecialidad' => $specialty], $item['profesiones']);

    return $item;
}

/**
 * The first step of a professional invitation (#417), as the panel takes it: the DNI, looked up with the fake registry
 * unless the test faked the real one. The acceptance that follows in the same test takes the identity it found from
 * the session. `99000003` is the fake registry's DNI no account holds.
 */
function lookUpInvitationDocument(string $rawToken, string $documentNumber = '99000003', bool $fakeRegistry = true): TestResponse
{
    if ($fakeRegistry) {
        config(['services.professional_registry.adapter' => 'fake']);
    }

    return fromPanel()->postJson("/api/v1/invitations/{$rawToken}/document-lookups", ['document_number' => $documentNumber]);
}

/**
 * Pauses the national professional search the way a failure does, for five minutes.
 */
function pauseNationalProfessionalSearch(): void
{
    Cache::put('professionals:national-professional-search:paused', true, 300);
}

/**
 * Makes the national professional search the registry and answers every lookup with `$results` (a page) or by running
 * it (a failure). Each lookup is a GET of the form and a POST of the DNI.
 */
function fakeNationalProfessionalSearch(string|Closure $results): void
{
    config([
        'services.professional_registry.adapter' => 'national_search',
        'services.national_professional_search.url' => 'https://www.argentina.gob.ar/salud/buscador-nacional-de-profesionales-de-la-salud',
        'services.national_professional_search.user_agent' => 'Clini/test',
    ]);

    Http::fake(['www.argentina.gob.ar/*' => fn (HttpRequest $request) => $request->method() === 'GET'
        ? Http::response(nationalProfessionalSearchFixture('form.html'))
        : (is_string($results) ? Http::response($results) : $results($request))]);
}

/**
 * A recorded-shape ARCA answer (tests/Fixtures/Arca, #246).
 */
function arcaFixture(string $name): string
{
    return (string) file_get_contents(__DIR__."/Fixtures/Arca/{$name}");
}

/**
 * Points the invoice issuer at ARCA (`arca`) with a throwaway self-signed
 * certificate, generated once per run: never a real one.
 */
function configureArca(string $environment = 'homologation'): void
{
    static $credentials = null;

    if ($credentials === null) {
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        $csr = openssl_csr_new(['commonName' => 'clini-test', 'serialNumber' => 'CUIT 20111111112'], $key);
        $certificate = openssl_csr_sign($csr, null, $key, 1);
        openssl_x509_export($certificate, $certificatePem);
        openssl_pkey_export($key, $keyPem);
        $credentials = ['certificate' => base64_encode($certificatePem), 'private_key' => base64_encode($keyPem)];
    }

    config([
        'invoicing.issuer' => 'arca',
        'invoicing.arca.environment' => $environment,
        'invoicing.arca.certificate' => $credentials['certificate'],
        'invoicing.arca.private_key' => $credentials['private_key'],
    ]);
}

/**
 * Fakes ARCA: WSAA answers `$login` and each WSFEv1 operation (by its
 * SOAPAction) the fixture or response given for it.
 *
 * @param  array<string, string|Closure>  $operations  operation => fixture name, or a closure building the response
 */
function fakeArca(array $operations, string $login = 'loginCms.xml'): void
{
    $answer = fn (string|Closure $fixture, HttpRequest $request) => $fixture instanceof Closure
        ? $fixture($request)
        : Http::response(arcaFixture($fixture), str_contains($fixture, 'already-authenticated') ? 500 : 200);

    Http::fake([
        '*afip.gov.ar/ws/services/LoginCms' => fn (HttpRequest $request) => $answer($login, $request),
        '*afip.gov.ar/wsfev1/service.asmx' => function (HttpRequest $request) use ($operations, $answer) {
            $operation = Str::afterLast(trim($request->header('SOAPAction')[0] ?? '', '"'), '/');

            return $answer($operations[$operation] ?? throw new LogicException("Unexpected WSFEv1 operation {$operation}."), $request);
        },
    ]);
}
