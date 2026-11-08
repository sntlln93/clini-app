<?php

declare(strict_types=1);

namespace App\Services\Invoicing;

use App\Contracts\InvoiceIssuer;
use App\Data\Invoices\AuthorizedVoucherData;
use App\Data\Invoices\VoucherRequestData;
use App\Enums\InvoiceEnvironment;
use App\Enums\InvoiceVoucherType;
use App\Exceptions\Invoices\InvoiceIssuerUnavailableException;
use App\Exceptions\Invoices\InvoiceVoucherRejectedException;
use App\Support\ArcaAccessTicket;
use App\Support\ArcaSoap;
use Carbon\CarbonImmutable;
use Carbon\Exceptions\InvalidFormatException;
use DOMNode;
use DOMXPath;
use Illuminate\Support\Facades\Config;
use LogicException;

/**
 * Adapter for ARCA's electronic invoicing web service, WSFEv1 (`wsfe`, RG
 * 4291), authenticated through WSAA (#246, ADR 0039). Hand-built SOAP over
 * the Http client, read by local name.
 *
 * Every voucher is services (`Concepto` 2) to a final consumer (`DocTipo` 99,
 * `DocNro` 0, `CondicionIVAReceptorId` 5), in pesos. For factura C the whole
 * amount is `ImpNeto`, with no VAT and no `Iva` array.
 */
final class ArcaInvoiceService implements InvoiceIssuer
{
    private const string NAMESPACE = 'http://ar.gov.afip.dif.FEV1/';

    /** Three calls at most per issuance: together with WSAA, within IssueInvoiceJob's timeout. */
    private const int TIMEOUT_SECONDS = 18;

    private const array URLS = [
        'homologation' => 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',
        'production' => 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
    ];

    private const int SERVICES = 2;

    private const int FINAL_CONSUMER_DOCUMENT_TYPE = 99;

    private const int FINAL_CONSUMER_VAT_CONDITION = 5;

    /** WSFEv1's own errors for a token and sign it no longer takes: 600 (not valid) and 601 (another CUIT). */
    private const array TICKET_ERRORS = ['600', '601'];

    /** FECompConsultar's «no data for those parameters». */
    private const string NOT_FOUND = '602';

    public function __construct(
        private readonly ArcaAccessTicket $ticket,
    ) {}

    public function environment(): InvoiceEnvironment
    {
        return InvoiceEnvironment::from(ArcaAccessTicket::environment());
    }

    public function lastAuthorizedNumber(int $pointOfSale, InvoiceVoucherType $type): int
    {
        $xpath = $this->call('FECompUltimoAutorizado', '<ar:PtoVta>'.$pointOfSale.'</ar:PtoVta><ar:CbteTipo>'.$type->value.'</ar:CbteTipo>');
        $this->ensureNoErrors($xpath, 'FECompUltimoAutorizado');
        $number = ArcaSoap::text($xpath, 'FECompUltimoAutorizadoResult/CbteNro');

        if ($number === null || ! ctype_digit($number)) {
            throw new InvoiceIssuerUnavailableException('FECompUltimoAutorizado', 'unreadable_answer');
        }

        return (int) $number;
    }

    public function authorize(VoucherRequestData $voucher): AuthorizedVoucherData
    {
        $amount = self::amount($voucher->amountCents);
        $xpath = $this->call('FECAESolicitar', '<ar:FeCAEReq>'
            .'<ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>'.$voucher->pointOfSale.'</ar:PtoVta><ar:CbteTipo>'.$voucher->type->value.'</ar:CbteTipo></ar:FeCabReq>'
            .'<ar:FeDetReq><ar:FECAEDetRequest>'
            .'<ar:Concepto>'.self::SERVICES.'</ar:Concepto>'
            .'<ar:DocTipo>'.self::FINAL_CONSUMER_DOCUMENT_TYPE.'</ar:DocTipo><ar:DocNro>0</ar:DocNro>'
            .'<ar:CbteDesde>'.$voucher->number.'</ar:CbteDesde><ar:CbteHasta>'.$voucher->number.'</ar:CbteHasta>'
            .'<ar:CbteFch>'.self::date($voucher->issuedOn).'</ar:CbteFch>'
            .'<ar:ImpTotal>'.$amount.'</ar:ImpTotal><ar:ImpTotConc>0</ar:ImpTotConc><ar:ImpNeto>'.$amount.'</ar:ImpNeto>'
            .'<ar:ImpOpEx>0</ar:ImpOpEx><ar:ImpTrib>0</ar:ImpTrib><ar:ImpIVA>0</ar:ImpIVA>'
            .'<ar:FchServDesde>'.self::date($voucher->serviceFrom).'</ar:FchServDesde>'
            .'<ar:FchServHasta>'.self::date($voucher->serviceTo).'</ar:FchServHasta>'
            .'<ar:FchVtoPago>'.self::date($voucher->paymentDueOn).'</ar:FchVtoPago>'
            .'<ar:MonId>PES</ar:MonId><ar:MonCotiz>1</ar:MonCotiz>'
            .'<ar:CondicionIVAReceptorId>'.self::FINAL_CONSUMER_VAT_CONDITION.'</ar:CondicionIVAReceptorId>'
            .'</ar:FECAEDetRequest></ar:FeDetReq></ar:FeCAEReq>');

        $detail = ArcaSoap::nodes($xpath, 'FeDetResp/*')[0] ?? null;
        $result = $detail !== null ? ArcaSoap::text($xpath, 'Resultado', $detail) : null;
        $cae = $detail !== null ? ArcaSoap::text($xpath, 'CAE', $detail) : null;

        if ($result === 'A' && $cae !== null) {
            return new AuthorizedVoucherData(
                number: $voucher->number,
                cae: $cae,
                caeExpiresOn: $this->answeredDate($xpath, 'CAEFchVto', $detail, 'FECAESolicitar'),
                issuedOn: $this->answeredDate($xpath, 'CbteFch', $detail, 'FECAESolicitar'),
                amountCents: $voucher->amountCents,
            );
        }

        if ($result === 'R') {
            $this->forgetRefusedTicket($xpath);

            throw new InvoiceVoucherRejectedException($voucher->number, [
                ...$this->codeMessages($xpath, $detail),
                ...ArcaSoap::messages($xpath, 'Errors/Err'),
            ]);
        }

        // No detail at all: the request itself failed (an `Errors` list, say a stale ticket).
        $this->ensureNoErrors($xpath, 'FECAESolicitar');

        throw new InvoiceIssuerUnavailableException('FECAESolicitar', 'unreadable_answer');
    }

    public function findAuthorized(int $pointOfSale, InvoiceVoucherType $type, int $number): ?AuthorizedVoucherData
    {
        $xpath = $this->call('FECompConsultar', '<ar:FeCompConsReq><ar:CbteTipo>'.$type->value.'</ar:CbteTipo><ar:CbteNro>'.$number.'</ar:CbteNro><ar:PtoVta>'.$pointOfSale.'</ar:PtoVta></ar:FeCompConsReq>');
        $errors = ArcaSoap::nodes($xpath, 'FECompConsultarResult/Errors/Err');

        if ($errors !== [] && ArcaSoap::text($xpath, 'Code', $errors[0]) === self::NOT_FOUND) {
            return null;
        }

        $this->ensureNoErrors($xpath, 'FECompConsultar');
        $found = ArcaSoap::nodes($xpath, 'FECompConsultarResult/ResultGet')[0] ?? null;
        $cae = $found !== null ? ArcaSoap::text($xpath, 'CodAutorizacion', $found) : null;
        $total = $found !== null ? ArcaSoap::text($xpath, 'ImpTotal', $found) : null;

        if ($found === null || $cae === null || $total === null || ! is_numeric($total) || ArcaSoap::text($xpath, 'Resultado', $found) !== 'A') {
            return null;
        }

        return new AuthorizedVoucherData(
            number: $number,
            cae: $cae,
            caeExpiresOn: $this->answeredDate($xpath, 'FchVto', $found, 'FECompConsultar'),
            issuedOn: $this->answeredDate($xpath, 'CbteFch', $found, 'FECompConsultar'),
            amountCents: (int) round((float) $total * 100),
        );
    }

    /**
     * Posts one WSFEv1 operation with its `Auth` block.
     */
    private function call(string $operation, string $arguments): DOMXPath
    {
        $ticket = $this->ticket->get();

        return ArcaSoap::call(
            self::URLS[ArcaAccessTicket::environment()],
            self::NAMESPACE.$operation,
            $operation,
            '<ar:'.$operation.'><ar:Auth>'
                .'<ar:Token>'.htmlspecialchars($ticket->token, ENT_XML1).'</ar:Token>'
                .'<ar:Sign>'.htmlspecialchars($ticket->sign, ENT_XML1).'</ar:Sign>'
                .'<ar:Cuit>'.self::issuerCuit().'</ar:Cuit>'
                .'</ar:Auth>'.$arguments.'</ar:'.$operation.'>',
            ['ar' => self::NAMESPACE],
            self::TIMEOUT_SECONDS,
        );
    }

    /**
     * An `Errors` list instead of a result: the request didn't go through.
     */
    private function ensureNoErrors(DOMXPath $xpath, string $step): void
    {
        $errors = ArcaSoap::nodes($xpath, 'Errors/Err');

        if ($errors === []) {
            return;
        }

        $this->forgetRefusedTicket($xpath);

        throw new InvoiceIssuerUnavailableException(
            $step,
            ArcaSoap::text($xpath, 'Code', $errors[0]),
            implode(' | ', ArcaSoap::messages($xpath, 'Errors/Err')),
        );
    }

    private function forgetRefusedTicket(DOMXPath $xpath): void
    {
        foreach (ArcaSoap::nodes($xpath, 'Errors/Err') as $error) {
            if (in_array(ArcaSoap::text($xpath, 'Code', $error), self::TICKET_ERRORS, true)) {
                $this->ticket->forget();

                return;
            }
        }
    }

    /**
     * Every `{Code, Msg}` under the voucher's detail, whichever of the
     * manual's two spellings (`Observaciones/Obs`, `Obs/Observaciones`) it uses.
     *
     * @return list<string>
     */
    private function codeMessages(DOMXPath $xpath, ?DOMNode $detail): array
    {
        if ($detail === null) {
            return [];
        }

        $messages = [];

        foreach (ArcaSoap::query($xpath, ".//*[*[local-name()='Code']]", $detail) as $node) {
            $messages[] = (ArcaSoap::text($xpath, 'Code', $node) ?? '?').': '.ArcaSoap::limit(ArcaSoap::text($xpath, 'Msg', $node) ?? '');
        }

        return $messages;
    }

    private function answeredDate(DOMXPath $xpath, string $element, DOMNode $context, string $step): CarbonImmutable
    {
        $value = ArcaSoap::text($xpath, $element, $context);

        try {
            $date = $value !== null && preg_match('/^\d{8}$/', $value) === 1
                ? CarbonImmutable::createFromFormat('!Ymd', $value)
                : null;
        } catch (InvalidFormatException) {
            $date = null;
        }

        if (! $date instanceof CarbonImmutable) {
            throw new InvoiceIssuerUnavailableException($step, 'unreadable_answer');
        }

        return $date;
    }

    private static function issuerCuit(): string
    {
        $cuit = Config::string('invoicing.issuer_data.cuit');

        if (preg_match('/^\d{11}$/', $cuit) !== 1) {
            throw new LogicException('INVOICE_ISSUER_CUIT must be the issuer\'s 11-digit CUIT.');
        }

        return $cuit;
    }

    /**
     * Two decimals with a dot: WSFEv1 reads `15000.00`, never `1.5E+4`.
     */
    private static function amount(int $cents): string
    {
        return intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }

    private static function date(CarbonImmutable $date): string
    {
        return $date->format('Ymd');
    }
}
