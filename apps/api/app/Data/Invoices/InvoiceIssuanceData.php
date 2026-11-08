<?php

declare(strict_types=1);

namespace App\Data\Invoices;

use App\Contracts\Data;

/**
 * A pending invoice to have authorized.
 */
final readonly class InvoiceIssuanceData implements Data
{
    public function __construct(
        public int $invoiceId,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return ['invoice_id' => $this->invoiceId];
    }
}
