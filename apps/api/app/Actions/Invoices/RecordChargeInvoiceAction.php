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
use App\Support\OrganizationPlan;
use App\Support\PracticePricing;
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
 * provider charged, never the plan's price. An annual charge keeps the
 * annual discount it got, printed as a note under its line, only when it is
 * exactly the discounted price for the practice's active professionals:
 * otherwise (the price or the team changed since) the discount can't be told
 * apart, and the invoice claims none.
 *
 * @implements Action<ChargeInvoiceData>
 */
final class RecordChargeInvoiceAction implements Action
{
    /** The only currency a factura C to a final consumer is issued in here. */
    private const string CURRENCY = 'ARS';

    public function __construct(
        private readonly PracticePricing $pricing,
        private readonly OrganizationPlan $plans,
    ) {}

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
            'annual_discount_percent' => $this->annualDiscountPercent($billing, $subscription->organization_id, $payment->amountCents),
        ]);
    }

    private function annualDiscountPercent(SubscriptionBilling $billing, int $organizationId, int $amountCents): ?int
    {
        $percent = $this->pricing->annualDiscountPercent();

        if ($billing !== SubscriptionBilling::Annual || $percent === 0) {
            return null;
        }

        $discounted = $this->pricing->amount($this->plans->activeProfessionals($organizationId), $billing) * 100;

        return $amountCents === $discounted ? $percent : null;
    }

    private static function description(SubscriptionBilling $billing): string
    {
        return match ($billing) {
            SubscriptionBilling::Monthly => 'Suscripción mensual a Clini, plan Consultorio',
            SubscriptionBilling::Annual => 'Suscripción anual a Clini, plan Consultorio',
        };
    }
}
