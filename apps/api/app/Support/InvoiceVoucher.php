<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\InvoiceVoucherType;
use App\Models\Invoice;
use Carbon\CarbonImmutable;

/**
 * How an issued invoice's voucher reads (#246): its number as ARCA prints it
 * (`C 00001-00000012`), its total in pesos, and the RG 4892 QR that lets
 * anyone check it against ARCA.
 */
final class InvoiceVoucher
{
    public const string QR_URL = 'https://www.arca.gob.ar/fe/qr/';

    /** A final consumer, as WSFEv1 and the QR identify one. */
    public const int FINAL_CONSUMER_DOCUMENT_TYPE = 99;

    public static function format(Invoice $invoice): string
    {
        /** @var InvoiceVoucherType|null $type */
        $type = $invoice->voucher_type;

        return ($type?->letter() ?? '').' '
            .str_pad((string) $invoice->point_of_sale, 5, '0', STR_PAD_LEFT).'-'
            .str_pad((string) $invoice->number, 8, '0', STR_PAD_LEFT);
    }

    /**
     * `$ 15.000,00`, as the panel shows prices.
     */
    public static function amount(int $cents): string
    {
        return '$ '.number_format($cents / 100, 2, ',', '.');
    }

    /**
     * Null until it is issued. The JSON goes with numbers, not strings, and
     * standard base64, as the specification's own example.
     */
    public static function qrUrl(Invoice $invoice): ?string
    {
        /** @var CarbonImmutable|null $issuedOn */
        $issuedOn = $invoice->issued_on;
        /** @var InvoiceVoucherType|null $type */
        $type = $invoice->voucher_type;

        if ($invoice->cae === null || $issuedOn === null || $type === null || $invoice->number === null) {
            return null;
        }

        $payload = json_encode([
            'ver' => 1,
            'fecha' => $issuedOn->toDateString(),
            'cuit' => (int) $invoice->issuer_cuit,
            'ptoVta' => $invoice->point_of_sale,
            'tipoCmp' => $type->value,
            'nroCmp' => $invoice->number,
            'importe' => round($invoice->amount_cents / 100, 2),
            'moneda' => 'PES',
            'ctz' => 1,
            'tipoDocRec' => self::FINAL_CONSUMER_DOCUMENT_TYPE,
            'nroDocRec' => 0,
            'tipoCodAut' => 'E',
            'codAut' => (int) $invoice->cae,
        ], JSON_THROW_ON_ERROR);

        return self::QR_URL.'?p='.base64_encode($payload);
    }
}
