<?php

declare(strict_types=1);

namespace App\Http\Resources\Subscriptions;

use App\Enums\InvoiceEnvironment;
use App\Enums\InvoiceStatus;
use App\Enums\InvoiceVoucherType;
use App\Models\Invoice;
use App\Support\InvoiceVoucher;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An invoice and, once issued, everything its PDF prints (#246): the panel
 * builds the file (ADR 0023). The receiver is always a final consumer, so it
 * carries no customer data.
 *
 * @mixin Invoice
 */
class InvoiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $invoice = $this->invoice();

        /** @var InvoiceStatus $status */
        $status = $invoice->status;
        /** @var CarbonImmutable $chargedAt */
        $chargedAt = $invoice->charged_at;
        /** @var CarbonImmutable $serviceFrom */
        $serviceFrom = $invoice->service_from;
        /** @var CarbonImmutable $serviceTo */
        $serviceTo = $invoice->service_to;

        return [
            'id' => $invoice->id,
            'status' => $status->value,
            'description' => $invoice->description,
            'amount_cents' => $invoice->amount_cents,
            'currency' => $invoice->currency,
            'charged_at' => $chargedAt->toIso8601String(),
            'service_from' => $serviceFrom->toDateString(),
            'service_to' => $serviceTo->toDateString(),
            'annual_discount_percent' => $invoice->annual_discount_percent,
            'annual_list_amount_cents' => $invoice->annual_list_amount_cents,
            'voucher' => $status === InvoiceStatus::Issued ? $this->voucher($invoice) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function voucher(Invoice $invoice): array
    {
        /** @var InvoiceVoucherType $type */
        $type = $invoice->voucher_type;
        /** @var InvoiceEnvironment $environment */
        $environment = $invoice->environment;
        /** @var CarbonImmutable $issuedOn */
        $issuedOn = $invoice->issued_on;
        /** @var CarbonImmutable $paymentDueOn */
        $paymentDueOn = $invoice->payment_due_on;
        /** @var CarbonImmutable $caeExpiresOn */
        $caeExpiresOn = $invoice->cae_expires_on;

        return [
            'letter' => $type->letter(),
            'type_code' => $type->value,
            'point_of_sale' => $invoice->point_of_sale,
            'number' => $invoice->number,
            'formatted_number' => InvoiceVoucher::format($invoice),
            'issued_on' => $issuedOn->toDateString(),
            'payment_due_on' => $paymentDueOn->toDateString(),
            'cae' => $invoice->cae,
            'cae_expires_on' => $caeExpiresOn->toDateString(),
            'qr_url' => InvoiceVoucher::qrUrl($invoice),
            // Only a voucher ARCA's production services authorized is a real one.
            'fiscally_valid' => $environment === InvoiceEnvironment::Production,
            'issuer' => $invoice->issuer,
        ];
    }

    private function invoice(): Invoice
    {
        /** @var Invoice $invoice */
        $invoice = $this->resource;

        return $invoice;
    }
}
