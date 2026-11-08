<?php

declare(strict_types=1);

namespace App\Exceptions\Invoices;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;
use Throwable;

/**
 * The invoice issuer didn't answer, or answered something its adapter can't
 * read (#246): a network error or a timeout, a SOAP fault (WSAA refusing the
 * certificate, or a ticket while another is still valid), an error list
 * instead of a result, or a body that isn't the XML it expects. Thrown inside
 * the job that issues the invoice, which retries it later: it never reaches
 * the panel, and the subscription never waits on it.
 */
final class InvoiceIssuerUnavailableException extends DomainException
{
    /**
     * @param  string  $step  the call that failed (`loginCms`, `FECAESolicitar`…)
     * @param  string|null  $providerCode  ARCA's own fault or error code, when it gave one
     */
    public function __construct(
        public readonly string $step,
        public readonly ?string $providerCode = null,
        public readonly ?string $providerMessage = null,
        ?Throwable $previous = null,
    ) {
        parent::__construct('The invoice issuer is unavailable.', previous: $previous);
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::InvoicesIssuerUnavailable;
    }

    public function httpStatus(): int
    {
        return 503;
    }

    /**
     * ARCA's answer carries no personal data: the voucher goes to a final
     * consumer, and the only CUIT involved is the issuer's.
     *
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [
            'step' => $this->step,
            'provider_code' => $this->providerCode,
            'provider_message' => $this->providerMessage,
        ];
    }
}
