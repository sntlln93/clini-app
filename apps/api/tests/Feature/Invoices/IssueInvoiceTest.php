<?php

declare(strict_types=1);

use App\Actions\Invoices\IssueInvoiceAction;
use App\Contracts\InvoiceIssuer;
use App\Data\Invoices\AuthorizedVoucherData;
use App\Data\Invoices\InvoiceIssuanceData;
use App\Data\Invoices\VoucherRequestData;
use App\Enums\InvoiceEnvironment;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceVoucherType;
use App\Enums\MembershipRole;
use App\Exceptions\Invoices\InvoiceIssuerUnavailableException;
use App\Exceptions\Invoices\InvoiceVoucherRejectedException;
use App\Jobs\Invoices\IssueInvoiceJob;
use App\Models\Invoice;
use App\Models\Membership;
use App\Models\Subscription;
use App\Notifications\Invoices\InvoiceIssuedNotification;
use App\Services\Invoicing\ArcaInvoiceService;
use App\Services\Invoicing\FakeInvoiceIssuer;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;

beforeEach(function () {
    Notification::fake();
    Date::setTestNow('2026-10-03 13:00:00');
});

afterEach(function () {
    Date::setTestNow();
});

/**
 * An issuer whose answers a test scripts, recording what it was asked.
 */
final class ScriptedInvoiceIssuer implements InvoiceIssuer
{
    /** @var list<VoucherRequestData> */
    public array $requested = [];

    /** @var list<int> */
    public array $looked = [];

    /**
     * @param  array<int, AuthorizedVoucherData>  $authorized  what findAuthorized finds, by number
     */
    public function __construct(
        public int $last = 0,
        public array $authorized = [],
        public ?Throwable $failure = null,
    ) {}

    public function environment(): InvoiceEnvironment
    {
        return InvoiceEnvironment::Homologation;
    }

    public function lastAuthorizedNumber(int $pointOfSale, InvoiceVoucherType $type): int
    {
        return $this->last;
    }

    public function authorize(VoucherRequestData $voucher): AuthorizedVoucherData
    {
        $this->requested[] = $voucher;

        if ($this->failure !== null) {
            throw $this->failure;
        }

        $this->last = $voucher->number;

        return new AuthorizedVoucherData($voucher->number, '7640123456'.str_pad((string) $voucher->number, 4, '0', STR_PAD_LEFT), $voucher->issuedOn->addDays(10), $voucher->issuedOn, $voucher->amountCents);
    }

    public function findAuthorized(int $pointOfSale, InvoiceVoucherType $type, int $number): ?AuthorizedVoucherData
    {
        $this->looked[] = $number;

        return $this->authorized[$number] ?? null;
    }
}

function scriptIssuer(ScriptedInvoiceIssuer $issuer): ScriptedInvoiceIssuer
{
    app()->instance(InvoiceIssuer::class, $issuer);

    return $issuer;
}

function issueInvoice(Invoice $invoice): ?Invoice
{
    return app(IssueInvoiceAction::class)->handle(new InvoiceIssuanceData($invoice->id));
}

/**
 * A pending invoice that reserved `$number` under the scripted issuer's identity.
 */
function reservedInvoice(int $number, array $attributes = []): Invoice
{
    return Invoice::factory()->create([
        'environment' => InvoiceEnvironment::Homologation,
        'issuer_cuit' => '20111111112',
        'point_of_sale' => 1,
        'voucher_type' => InvoiceVoucherType::FacturaC,
        'number' => $number,
        'issued_on' => '2026-10-02',
        'payment_due_on' => '2026-10-02',
        ...$attributes,
    ]);
}

test('a pending invoice is issued with the next number and its owners are told', function () {
    $issuer = scriptIssuer(new ScriptedInvoiceIssuer(last: 41));
    $invoice = Invoice::factory()->create();
    $owner = Membership::factory()->create(['organization_id' => $invoice->organization_id, 'roles' => [MembershipRole::Owner]]);
    $staff = Membership::factory()->create(['organization_id' => $invoice->organization_id, 'roles' => [MembershipRole::Staff]]);

    issueInvoice($invoice);

    $invoice->refresh();
    expect($invoice->status)->toBe(InvoiceStatus::Issued)
        ->and($invoice->environment)->toBe(InvoiceEnvironment::Homologation)
        ->and($invoice->issuer_cuit)->toBe('20111111112')
        ->and($invoice->point_of_sale)->toBe(1)
        ->and($invoice->voucher_type)->toBe(InvoiceVoucherType::FacturaC)
        ->and($invoice->number)->toBe(42)
        ->and($invoice->cae)->toBe('76401234560042')
        ->and($invoice->cae_expires_on->toDateString())->toBe('2026-10-13')
        ->and($invoice->issued_on->toDateString())->toBe('2026-10-03')
        ->and($invoice->issuer)->toBe([
            'cuit' => '20111111112',
            'name' => 'Emisor de prueba',
            'address' => 'Calle Falsa 123, CABA',
            'vat_condition' => 'Responsable Monotributo',
            'gross_income' => '20111111112',
            'activity_start' => '2026-01-01',
        ]);
    expect($issuer->requested)->toHaveCount(1)
        ->and($issuer->requested[0]->amountCents)->toBe(1500000)
        ->and($issuer->requested[0]->serviceFrom->toDateString())->toBe('2026-10-03')
        ->and($issuer->requested[0]->serviceTo->toDateString())->toBe('2026-11-02');

    Notification::assertSentTo($owner->user, InvoiceIssuedNotification::class, fn (InvoiceIssuedNotification $notification) => $notification->invoice->is($invoice));
    Notification::assertNotSentTo($staff->user, InvoiceIssuedNotification::class);
});

test('invoices are numbered consecutively', function () {
    scriptIssuer(new ScriptedInvoiceIssuer(last: 7));
    $first = Invoice::factory()->create();
    $second = Invoice::factory()->create();

    issueInvoice($first);
    issueInvoice($second);

    expect($first->fresh()->number)->toBe(8)
        ->and($second->fresh()->number)->toBe(9);
});

test('an invoice already issued is left as it is', function () {
    $issuer = scriptIssuer(new ScriptedInvoiceIssuer(last: 41));
    $invoice = Invoice::factory()->issued(3)->create();

    expect(issueInvoice($invoice))->toBeNull();

    expect($issuer->requested)->toBe([])
        ->and($invoice->fresh()->number)->toBe(3);
    Notification::assertNothingSent();
});

test('the voucher is dated the day it is issued in Argentina, and its payment due date is never earlier', function () {
    // 01:30 UTC on the 4th is still the 3rd in Argentina.
    Date::setTestNow('2026-10-04 01:30:00');
    $issuer = scriptIssuer(new ScriptedInvoiceIssuer);
    $chargedLate = Invoice::factory()->create(['charged_at' => '2026-10-01 13:00:00']);
    $chargedToday = Invoice::factory()->create(['charged_at' => '2026-10-04 01:00:00']);

    issueInvoice($chargedLate);
    issueInvoice($chargedToday);

    expect($issuer->requested[0]->issuedOn->toDateString())->toBe('2026-10-03')
        // A charge from days before the voucher: WSFEv1 refuses a due date before the voucher's own.
        ->and($issuer->requested[0]->paymentDueOn->toDateString())->toBe('2026-10-03')
        ->and($chargedLate->fresh()->payment_due_on->toDateString())->toBe('2026-10-03')
        ->and($issuer->requested[1]->paymentDueOn->toDateString())->toBe('2026-10-03');
});

test('a number authorized for the invoice before a lost answer is adopted, not requested again', function () {
    $invoice = reservedInvoice(42);
    $issuer = scriptIssuer(new ScriptedInvoiceIssuer(last: 42, authorized: [
        42 => new AuthorizedVoucherData(42, '76401234567890', CarbonImmutable::parse('2026-10-12'), CarbonImmutable::parse('2026-10-02'), 1500000),
    ]));

    issueInvoice($invoice);

    $invoice->refresh();
    expect($issuer->looked)->toBe([42])
        ->and($issuer->requested)->toBe([])
        ->and($invoice->status)->toBe(InvoiceStatus::Issued)
        ->and($invoice->number)->toBe(42)
        ->and($invoice->cae)->toBe('76401234567890')
        ->and($invoice->issued_on->toDateString())->toBe('2026-10-02');
});

test('a reserved number authorized for another amount is not adopted', function () {
    $invoice = reservedInvoice(42);
    $issuer = scriptIssuer(new ScriptedInvoiceIssuer(last: 42, authorized: [
        42 => new AuthorizedVoucherData(42, '76401234567890', CarbonImmutable::parse('2026-10-12'), CarbonImmutable::parse('2026-10-02'), 999),
    ]));

    issueInvoice($invoice);

    expect($issuer->requested)->toHaveCount(1)
        ->and($invoice->fresh()->number)->toBe(43);
});

test('a reserved number never authorized is requested again as the next one', function () {
    $invoice = reservedInvoice(42);
    $issuer = scriptIssuer(new ScriptedInvoiceIssuer(last: 41));

    issueInvoice($invoice);

    expect($issuer->looked)->toBe([42])
        ->and($issuer->requested[0]->number)->toBe(42)
        ->and($invoice->fresh()->status)->toBe(InvoiceStatus::Issued);
});

test('a stale reservation of another pending invoice gives way to the next number', function () {
    $stale = reservedInvoice(42);
    $invoice = Invoice::factory()->create();
    scriptIssuer(new ScriptedInvoiceIssuer(last: 41));

    issueInvoice($invoice);

    expect($invoice->fresh()->number)->toBe(42)
        ->and($stale->fresh()->number)->toBeNull()
        ->and($stale->fresh()->status)->toBe(InvoiceStatus::Pending);
});

test('a rejected voucher frees its number and the invoice stays pending', function () {
    $invoice = Invoice::factory()->create();
    scriptIssuer(new ScriptedInvoiceIssuer(last: 41, failure: new InvoiceVoucherRejectedException(42, ['10016: El numero no corresponde'])));

    expect(fn () => issueInvoice($invoice))->toThrow(InvoiceVoucherRejectedException::class);

    $invoice->refresh();
    expect($invoice->status)->toBe(InvoiceStatus::Pending)
        ->and($invoice->number)->toBeNull()
        ->and($invoice->issued_on)->toBeNull();
    Notification::assertNothingSent();
});

test('an issuer that does not answer keeps the reserved number for the next attempt', function () {
    $invoice = Invoice::factory()->create();
    scriptIssuer(new ScriptedInvoiceIssuer(last: 41, failure: new InvoiceIssuerUnavailableException('FECAESolicitar')));

    expect(fn () => issueInvoice($invoice))->toThrow(InvoiceIssuerUnavailableException::class);

    $invoice->refresh();
    expect($invoice->status)->toBe(InvoiceStatus::Pending)
        ->and($invoice->number)->toBe(42)
        ->and($invoice->environment)->toBe(InvoiceEnvironment::Homologation);
});

test('a reservation under another environment or point of sale is not looked up', function () {
    $invoice = reservedInvoice(42, ['point_of_sale' => 2]);
    $issuer = scriptIssuer(new ScriptedInvoiceIssuer(last: 9));

    issueInvoice($invoice);

    expect($issuer->looked)->toBe([])
        ->and($invoice->fresh()->point_of_sale)->toBe(1)
        ->and($invoice->fresh()->number)->toBe(10);
});

test('the fake issuer numbers after its own vouchers and makes up a CAE', function () {
    config(['invoicing.issuer' => 'fake']);
    Invoice::factory()->issued(5)->create();
    $invoice = Invoice::factory()->create();

    issueInvoice($invoice);

    $invoice->refresh();
    expect($invoice->environment)->toBe(InvoiceEnvironment::Fake)
        ->and($invoice->number)->toBe(6)
        ->and($invoice->cae)->toBe(FakeInvoiceIssuer::cae(1, 6))
        ->and(strlen($invoice->cae))->toBe(14);
});

test('a configuration Clini cannot issue with stops before reserving a number', function (array $config, string $message) {
    $issuer = scriptIssuer(new ScriptedInvoiceIssuer);
    $invoice = Invoice::factory()->create();
    config($config);

    expect(fn () => issueInvoice($invoice))->toThrow(LogicException::class, $message);

    expect($issuer->requested)->toBe([])
        ->and($invoice->fresh()->number)->toBeNull();
})->with([
    'no point of sale' => [['invoicing.point_of_sale' => 0], 'INVOICE_POINT_OF_SALE'],
    'factura B' => [['invoicing.voucher_type' => 6], 'INVOICE_VOUCHER_TYPE=6 is not supported'],
    // The voucher prints them once authorized, which can't be undone.
    'no issuer name' => [['invoicing.issuer_data.name' => ' '], 'name is empty'],
    'no address' => [['invoicing.issuer_data.address' => ''], 'address is empty'],
    'no activity start' => [['invoicing.issuer_data.activity_start' => ''], 'activity_start is empty'],
    'an impossible activity start' => [['invoicing.issuer_data.activity_start' => '2026-02-30'], 'INVOICE_ISSUER_ACTIVITY_START must be a Y-m-d date'],
]);

test('the job ends within its timeout, below the queue\'s retry_after', function () {
    expect((new IssueInvoiceJob(1))->timeout)->toBeLessThan(config()->integer('queue.connections.database.retry_after'));
});

test('INVOICE_ISSUER picks the adapter, and production refuses the fake one', function () {
    config(['invoicing.issuer' => 'arca']);
    expect(app(InvoiceIssuer::class))->toBeInstanceOf(ArcaInvoiceService::class);

    config(['invoicing.issuer' => 'fake']);
    expect(app(InvoiceIssuer::class))->toBeInstanceOf(FakeInvoiceIssuer::class);

    $this->app['env'] = 'production';

    try {
        expect(fn () => app(InvoiceIssuer::class))->toThrow(LogicException::class, 'refused in production');

        config(['invoicing.issuer' => 'arca']);
        expect(app(InvoiceIssuer::class))->toBeInstanceOf(ArcaInvoiceService::class);
    } finally {
        $this->app['env'] = 'testing';
    }

    config(['invoicing.issuer' => 'afip']);
    expect(fn () => app(InvoiceIssuer::class))->toThrow(LogicException::class, 'INVOICE_ISSUER must be arca or fake.');
});

test('the hourly sweep queues every invoice still pending after its own retries', function () {
    Queue::fake();
    $stuck = Invoice::factory()->create(['created_at' => now()->subHours(4)]);
    Invoice::factory()->create(['created_at' => now()->subMinutes(30)]);
    Invoice::factory()->issued()->create(['created_at' => now()->subDays(2)]);

    $this->artisan('invoices:issue-pending')->assertSuccessful();

    Queue::assertPushed(IssueInvoiceJob::class, 1);
    Queue::assertPushed(IssueInvoiceJob::class, fn (IssueInvoiceJob $job) => $job->invoiceId === $stuck->id);
});

test('the job is unique per invoice and logs only ids when it gives up', function () {
    Log::spy();
    $job = new IssueInvoiceJob(7);

    $job->failed(new InvoiceIssuerUnavailableException('FECAESolicitar', '500', 'Error interno'));

    expect($job->uniqueId())->toBe('7');
    Log::shouldHaveReceived('error')->once()->with(
        'An invoice could not be issued after every retry; it stays pending.',
        ['invoice_id' => 7, 'exception' => InvoiceIssuerUnavailableException::class],
    );
});

test('the invoice of a soft-deleted organization is still issued, with nobody to tell', function () {
    scriptIssuer(new ScriptedInvoiceIssuer);
    $invoice = Invoice::factory()->create();
    Subscription::withoutGlobalScope('organization')->findOrFail($invoice->subscription_id)->organization->delete();

    issueInvoice($invoice);

    expect($invoice->fresh()->status)->toBe(InvoiceStatus::Issued);
    Notification::assertNothingSent();
});
