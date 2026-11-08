<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * An invoice is written `pending` with its charge and turns `issued` once ARCA
 * authorizes it (#246). There is no failed state: a voucher ARCA rejects stays
 * pending, and `invoices:issue-pending` asks again.
 */
enum InvoiceStatus: string
{
    case Pending = 'pending';
    case Issued = 'issued';
}
