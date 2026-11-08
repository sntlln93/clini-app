<?php

declare(strict_types=1);

namespace App\Actions\Invoices;

use App\Contracts\Action;
use App\Contracts\Data;
use App\Data\Invoices\ChargeInvoiceData;
use App\Enums\InvoiceStatus;
use App\Enums\SubscriptionBilling;
use App\Enums\SubscriptionPaymentOutcome;
use App\Models\Invoice;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;

/**
 * Writes the pending invoice of an approved subscription charge (#246, ADR
 * 0039), inside the webhook's own transaction, with the subscription row
 * locked: every notification about the same charge waits on that lock, so
 * the charge gets one invoice, whatever the provider repeats (the unique
 * provider payment id backs it). Returns the invoice only when this call
 * wrote it; the caller then queues its issuance.
 *
 * Every approved charge is invoiced, even one too old to change the
 * subscription's state: the money was collected either way.
 *
 * The service period starts on the charge's billing date (in Argentina) and
 * covers the months the subscription charges for. The amount is what the
 * provider charged, never the plan's price.
 *
 * @implements Action<ChargeInvoiceData>
 */
final class RecordChargeInvoiceAction implements Action
{
    /** The only currency a factura C to a final consumer is issued in here. */
    private const string CURRENCY = 'ARS';

    /**
     * @param  ChargeInvoiceData  $dto
     */
    public function handle(Data $dto): ?Invoice
    {
        $payment = $dto->payment;
        $subscription = $dto->subscription;

        if ($payment->outcome !== SubscriptionPaymentOutcome::Approved) {
            return null;
        }

        $alreadyRecorded = Invoice::withoutGlobalScope('organization')
            ->where('provider', $dto->provider)
            ->where('provider_payment_id', $payment->id)
            ->exists();

        if ($alreadyRecorded) {
            return null;
        }

        if ($payment->amountCents === null || $payment->amountCents <= 0 || $payment->currency !== self::CURRENCY) {
            // Not invoiceable as reported: a person has to look at it. Ids only.
            Log::error('An approved subscription charge has no amount in pesos; no invoice was recorded.', [
                'subscription_id' => $subscription->id,
                'payment_id' => $payment->id,
                'currency' => $payment->currency,
            ]);

            return null;
        }

        /** @var SubscriptionBilling $billing */
        $billing = $subscription->billing;
        $chargedAt = $payment->chargedAt ?? CarbonImmutable::now();
        $serviceFrom = $chargedAt->setTimezone(Invoice::FISCAL_TIMEZONE)->startOfDay();

        return Invoice::withoutGlobalScope('organization')->create([
            'organization_id' => $subscription->organization_id,
            'subscription_id' => $subscription->id,
            'provider' => $dto->provider,
            'provider_payment_id' => $payment->id,
            'status' => InvoiceStatus::Pending,
            'amount_cents' => $payment->amountCents,
            'currency' => self::CURRENCY,
            'charged_at' => $chargedAt->utc(),
            'service_from' => $serviceFrom->toDateString(),
            'service_to' => $serviceFrom->addMonthsNoOverflow($billing->months())->subDay()->toDateString(),
            'description' => self::description($billing),
        ]);
    }

    private static function description(SubscriptionBilling $billing): string
    {
        return match ($billing) {
            SubscriptionBilling::Monthly => 'Suscripción mensual a Clini, plan Consultorio',
            SubscriptionBilling::Annual => 'Suscripción anual a Clini, plan Consultorio',
        };
    }
}
