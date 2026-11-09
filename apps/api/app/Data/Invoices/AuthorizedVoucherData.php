<?php

declare(strict_types=1);

namespace App\Data\Invoices;

use App\Contracts\Data;
use Carbon\CarbonImmutable;

/**
 * A voucher the issuer authorized: its number, its CAE and the CAE's due date,
 * with the date and total it was authorized for (so a voucher recovered after
 * a timeout can be checked against the invoice it should be).
 */
final readonly class AuthorizedVoucherData implements Data
{
    public function __construct(
        public int $number,
        public string $cae,
        public CarbonImmutable $caeExpiresOn,
        public CarbonImmutable $issuedOn,
        public int $amountCents,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'number' => $this->number,
            'cae' => $this->cae,
            'cae_expires_on' => $this->caeExpiresOn->toDateString(),
            'issued_on' => $this->issuedOn->toDateString(),
            'amount_cents' => $this->amountCents,
        ];
    }
}
