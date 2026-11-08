<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Contracts\InvoiceIssuer;
use App\Data\Invoices\AuthorizedVoucherData;
use App\Data\Invoices\InvoiceIssuanceData;
use App\Data\Invoices\VoucherRequestData;
use App\Enums\InvoiceEnvironment;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceVoucherType;
use App\Exceptions\Invoices\InvoiceIssuerUnavailableException;
use App\Exceptions\Invoices\InvoiceVoucherRejectedException;
use App\Models\Invoice;
use App\Models\Organization;
use App\Notifications\Invoices\InvoiceIssuedNotification;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use LogicException;

/**
 * Has a pending invoice authorized by the issuer and tells the owners (#246,
 * ADR 0039). Returns the invoice when this call issued it; null when it was
 * already issued (a retried or repeated job) or no longer exists.
 *
 * Numbering never repeats or skips a number: the issuer's last number is
 * asked and the next one requested under one lock per environment, CUIT,
 * point of sale and type. The number is written on the invoice (reserved)
 * before it is requested, so an answer lost to a timeout is recovered, not
 * requested again: the next attempt first asks whether that number was
 * authorized with this invoice's amount, and adopts it if so. A reservation
 * the issuer never authorized is let go; another pending invoice holding the
 * number about to be used is such a reservation, since the issuer's last
 * number is below it. A rejection frees the number too.
 *
 * The voucher is dated the day it is issued (in Argentina). Its payment due
 * date is the charge's, unless that is earlier: WSFEv1 refuses a due date
 * before the voucher's own.
 *
 * @implements Action<InvoiceIssuanceData>
 */
final class IssueInvoiceAction implements Action
{
    private const int LOCK_SECONDS = 300;

    private const int LOCK_WAIT_SECONDS = 60;

    public function __construct(
        private readonly InvoiceIssuer $issuer,
    ) {}

    /**
     * @param  InvoiceIssuanceData  $dto
     *
     * @throws InvoiceIssuerUnavailableException
     * @throws InvoiceVoucherRejectedException
     */
    public function handle(Data $dto): ?Invoice
    {
        $type = InvoiceVoucherType::configured();
        $pointOfSale = config()->integer('invoicing.point_of_sale');
        $cuit = Config::string('invoicing.issuer_data.cuit');
        $environment = $this->issuer->environment();

        if ($pointOfSale <= 0) {
            throw new LogicException('INVOICE_POINT_OF_SALE must be the point of sale enabled for web services.');
        }

        $lockKey = "invoices:numbering:{$environment->value}:{$cuit}:{$pointOfSale}:{$type->value}";

        $issued = null;

        try {
            Cache::lock($lockKey, self::LOCK_SECONDS)->block(
                self::LOCK_WAIT_SECONDS,
                function () use (&$issued, $dto, $environment, $cuit, $pointOfSale, $type): void {
                    $issued = $this->issue($dto->invoiceId, $environment, $cuit, $pointOfSale, $type);
                },
            );
        } catch (LockTimeoutException $exception) {
            throw new InvoiceIssuerUnavailableException('numbering_lock', previous: $exception);
        }

        if (! $issued instanceof Invoice) {
            return null;
        }

        $this->notifyOwners($issued);

        return $issued;
    }

    private function issue(int $invoiceId, InvoiceEnvironment $environment, string $cuit, int $pointOfSale, InvoiceVoucherType $type): ?Invoice
    {
        $invoice = Invoice::withoutGlobalScope('organization')->find($invoiceId);

        if ($invoice === null || $invoice->status === InvoiceStatus::Issued) {
            return null;
        }

        $identity = [
            'environment' => $environment,
            'issuer_cuit' => $cuit,
            'point_of_sale' => $pointOfSale,
            'voucher_type' => $type,
        ];

        if ($invoice->number !== null && $this->reservedUnder($invoice, $identity)) {
            $found = $this->issuer->findAuthorized($pointOfSale, $type, $invoice->number);

            if ($found !== null && $found->amountCents === $invoice->amount_cents) {
                return $this->markIssued($invoice, $found);
            }
        }

        $number = $this->issuer->lastAuthorizedNumber($pointOfSale, $type) + 1;
        $voucher = $this->reserve($invoice, $identity, $pointOfSale, $type, $number);

        try {
            $authorized = $this->issuer->authorize($voucher);
        } catch (InvoiceVoucherRejectedException $exception) {
            $this->release($invoice);

            throw $exception;
        }

        return $this->markIssued($invoice, $authorized);
    }

    /**
     * @param  array<string, mixed>  $identity
     */
    private function reservedUnder(Invoice $invoice, array $identity): bool
    {
        return $invoice->environment === $identity['environment']
            && $invoice->issuer_cuit === $identity['issuer_cuit']
            && $invoice->point_of_sale === $identity['point_of_sale']
            && $invoice->voucher_type === $identity['voucher_type'];
    }

    /**
     * @param  array<string, mixed>  $identity
     */
    private function reserve(Invoice $invoice, array $identity, int $pointOfSale, InvoiceVoucherType $type, int $number): VoucherRequestData
    {
        $issuedOn = CarbonImmutable::now(Invoice::FISCAL_TIMEZONE)->startOfDay();
        /** @var CarbonImmutable $chargedAt */
        $chargedAt = $invoice->charged_at;
        $chargedOn = $chargedAt->setTimezone(Invoice::FISCAL_TIMEZONE)->startOfDay();
        $paymentDueOn = $chargedOn->max($issuedOn);

        DB::transaction(function () use ($invoice, $identity, $number, $issuedOn, $paymentDueOn): void {
            // Never authorized (the issuer's last number is below it): a stale reservation.
            Invoice::withoutGlobalScope('organization')
                ->where($identity)
                ->where('number', $number)
                ->where('status', InvoiceStatus::Pending)
                ->whereKeyNot($invoice->id)
                ->update(['number' => null, 'issued_on' => null, 'payment_due_on' => null, 'updated_at' => now()]);

            $invoice->update([
                ...$identity,
                'number' => $number,
                'issued_on' => $issuedOn->toDateString(),
                'payment_due_on' => $paymentDueOn->toDateString(),
            ]);
        });

        /** @var CarbonImmutable $serviceFrom */
        $serviceFrom = $invoice->service_from;
        /** @var CarbonImmutable $serviceTo */
        $serviceTo = $invoice->service_to;

        return new VoucherRequestData(
            pointOfSale: $pointOfSale,
            type: $type,
            number: $number,
            issuedOn: $issuedOn,
            amountCents: $invoice->amount_cents,
            serviceFrom: $serviceFrom,
            serviceTo: $serviceTo,
            paymentDueOn: $paymentDueOn,
        );
    }

    private function release(Invoice $invoice): void
    {
        $invoice->update(['number' => null, 'issued_on' => null, 'payment_due_on' => null]);
    }

    private function markIssued(Invoice $invoice, AuthorizedVoucherData $authorized): Invoice
    {
        $invoice->update([
            'status' => InvoiceStatus::Issued,
            'number' => $authorized->number,
            'issued_on' => $authorized->issuedOn->toDateString(),
            'cae' => $authorized->cae,
            'cae_expires_on' => $authorized->caeExpiresOn->toDateString(),
            'issued_at' => CarbonImmutable::now(),
            'issuer' => [
                'cuit' => Config::string('invoicing.issuer_data.cuit'),
                'name' => Config::string('invoicing.issuer_data.name'),
                'address' => Config::string('invoicing.issuer_data.address'),
                'vat_condition' => Config::string('invoicing.issuer_data.vat_condition'),
                'gross_income' => Config::string('invoicing.issuer_data.gross_income'),
                'activity_start' => Config::string('invoicing.issuer_data.activity_start'),
            ],
        ]);

        return $invoice;
    }

    private function notifyOwners(Invoice $invoice): void
    {
        $organization = Organization::query()->find($invoice->organization_id);

        if ($organization === null) {
            return;
        }

        Notification::send($organization->ownerUsers(), new InvoiceIssuedNotification($invoice));
    }
}
