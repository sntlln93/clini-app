<?php

declare(strict_types=1);

namespace App\Enums;

use LogicException;

/**
 * ARCA's voucher type (`CbteTipo`) of the subscription's invoices (#246, ADR
 * 0039). A monotributista issues factura C whoever the customer is, so it is
 * the only one supported: factura A or B needs an issuer registered for VAT,
 * and amounts with VAT, which the request doesn't build yet.
 */
enum InvoiceVoucherType: int
{
    case FacturaC = 11;

    /**
     * The type `INVOICE_VOUCHER_TYPE` names; refuses one Clini can't issue.
     */
    public static function configured(): self
    {
        $configured = config()->integer('invoicing.voucher_type');

        return self::tryFrom($configured)
            ?? throw new LogicException("INVOICE_VOUCHER_TYPE={$configured} is not supported: only factura C (11) is.");
    }

    public function letter(): string
    {
        return match ($this) {
            self::FacturaC => 'C',
        };
    }
}
