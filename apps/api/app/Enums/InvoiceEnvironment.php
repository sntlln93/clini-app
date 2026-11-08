<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Where an invoice's voucher was authorized (#246). Only `production` is a
 * real voucher: one from ARCA's homologation services, or from the fake
 * issuer, has no fiscal validity, and the panel says so on its PDF.
 */
enum InvoiceEnvironment: string
{
    case Production = 'production';
    case Homologation = 'homologation';
    case Fake = 'fake';
}
