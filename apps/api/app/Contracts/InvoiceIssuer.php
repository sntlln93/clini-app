<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Data\Invoices\AuthorizedVoucherData;
use App\Data\Invoices\VoucherRequestData;
use App\Enums\InvoiceEnvironment;
use App\Enums\InvoiceVoucherType;
use App\Exceptions\Invoices\InvoiceIssuerUnavailableException;
use App\Exceptions\Invoices\InvoiceVoucherRejectedException;

/**
 * Who authorizes the subscription's invoices (#246, ADR 0039): ARCA's
 * electronic invoicing web services, or a fake one outside production. Every
 * call is for the issuer's own CUIT, from configuration.
 */
interface InvoiceIssuer
{
    public function environment(): InvoiceEnvironment;

    /**
     * The last voucher number authorized for that point of sale and type; 0
     * when there is none yet.
     *
     * @throws InvoiceIssuerUnavailableException
     */
    public function lastAuthorizedNumber(int $pointOfSale, InvoiceVoucherType $type): int;

    /**
     * Asks for the CAE of one voucher, numbered by the caller.
     *
     * @throws InvoiceIssuerUnavailableException when it didn't answer (the voucher may have been authorized anyway)
     * @throws InvoiceVoucherRejectedException when it answered and refused it
     */
    public function authorize(VoucherRequestData $voucher): AuthorizedVoucherData;

    /**
     * A voucher already authorized under that number, or null when there is
     * none: how an answer lost to a timeout is recovered.
     *
     * @throws InvoiceIssuerUnavailableException
     */
    public function findAuthorized(int $pointOfSale, InvoiceVoucherType $type, int $number): ?AuthorizedVoucherData;
}
