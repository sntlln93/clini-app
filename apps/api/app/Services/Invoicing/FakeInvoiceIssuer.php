<?php

declare(strict_types=1);

namespace App\Services\Invoicing;

use App\Contracts\InvoiceIssuer;
use App\Data\Invoices\AuthorizedVoucherData;
use App\Data\Invoices\VoucherRequestData;
use App\Enums\InvoiceEnvironment;
use App\Enums\InvoiceVoucherType;
use App\Models\Invoice;
use Illuminate\Support\Facades\Config;

/**
 * Authorizes every voucher with a made-up CAE and never leaves Clini (#246):
 * dev, CI and e2e. Its vouchers are marked `fake`, and the panel prints them
 * as having no fiscal validity. Production refuses it (`AppServiceProvider`).
 *
 * The last number is the last one it issued, so numbering behaves like
 * ARCA's: consecutive per point of sale and type.
 */
final class FakeInvoiceIssuer implements InvoiceIssuer
{
    public function environment(): InvoiceEnvironment
    {
        return InvoiceEnvironment::Fake;
    }

    public function lastAuthorizedNumber(int $pointOfSale, InvoiceVoucherType $type): int
    {
        $last = Invoice::withoutGlobalScope('organization')
            ->where('environment', InvoiceEnvironment::Fake)
            ->where('issuer_cuit', Config::string('invoicing.issuer_data.cuit'))
            ->where('point_of_sale', $pointOfSale)
            ->where('voucher_type', $type)
            ->whereNotNull('cae')
            ->max('number');

        return is_numeric($last) ? (int) $last : 0;
    }

    public function authorize(VoucherRequestData $voucher): AuthorizedVoucherData
    {
        return new AuthorizedVoucherData(
            number: $voucher->number,
            cae: self::cae($voucher->pointOfSale, $voucher->number),
            caeExpiresOn: $voucher->issuedOn->addDays(10),
            issuedOn: $voucher->issuedOn,
            amountCents: $voucher->amountCents,
        );
    }

    public function findAuthorized(int $pointOfSale, InvoiceVoucherType $type, int $number): ?AuthorizedVoucherData
    {
        return null;
    }

    /**
     * 14 digits, like ARCA's, starting with 9 so it reads as none of theirs.
     */
    public static function cae(int $pointOfSale, int $number): string
    {
        return '9'.str_pad((string) $pointOfSale, 5, '0', STR_PAD_LEFT).str_pad((string) $number, 8, '0', STR_PAD_LEFT);
    }
}
