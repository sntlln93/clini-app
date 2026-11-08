<?php

declare(strict_types=1);

namespace App\Data\Invoices;

use App\Contracts\Data;
use App\Enums\InvoiceVoucherType;
use Carbon\CarbonImmutable;

/**
 * One voucher to authorize: always services (`Concepto` 2) to a final
 * consumer, in pesos (#246). The dates are calendar dates in Argentina.
 */
final readonly class VoucherRequestData implements Data
{
    public function __construct(
        public int $pointOfSale,
        public InvoiceVoucherType $type,
        public int $number,
        public CarbonImmutable $issuedOn,
        public int $amountCents,
        public CarbonImmutable $serviceFrom,
        public CarbonImmutable $serviceTo,
        public CarbonImmutable $paymentDueOn,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'point_of_sale' => $this->pointOfSale,
            'type' => $this->type->value,
            'number' => $this->number,
            'issued_on' => $this->issuedOn->toDateString(),
            'amount_cents' => $this->amountCents,
            'service_from' => $this->serviceFrom->toDateString(),
            'service_to' => $this->serviceTo->toDateString(),
            'payment_due_on' => $this->paymentDueOn->toDateString(),
        ];
    }
}
