<?php

declare(strict_types=1);

namespace App\Exceptions\Invoices;

use App\Enums\ErrorCode;
use App\Exceptions\DomainException;

/**
 * The issuer answered and refused the voucher (WSFEv1's `Resultado` R): no
 * CAE, so its number was not used. The invoice stays pending and is asked for
 * again later, with whatever number is next then.
 */
final class InvoiceVoucherRejectedException extends DomainException
{
    /**
     * @param  array<int, string>  $observations  ARCA's observation and error codes, `<code>: <message>`
     */
    public function __construct(
        public readonly int $number,
        public readonly array $observations,
    ) {
        parent::__construct('The invoice issuer rejected the voucher.');
    }

    public function errorCode(): ErrorCode
    {
        return ErrorCode::InvoicesVoucherRejected;
    }

    public function httpStatus(): int
    {
        return 409;
    }

    /**
     * @return array<string, mixed>
     */
    public function logContext(): array
    {
        return [
            'voucher_number' => $this->number,
            'observations' => $this->observations,
        ];
    }
}
