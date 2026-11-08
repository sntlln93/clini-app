<?php

declare(strict_types=1);

namespace App\Data\Invoices;

use App\Contracts\Data;
use Carbon\CarbonImmutable;

/**
 * WSAA's access ticket for `wsfe`: the token and sign every WSFEv1 call
 * carries, valid until `expiresAt` (12 hours after it was issued).
 */
final readonly class ArcaAccessTicketData implements Data
{
    public function __construct(
        public string $token,
        public string $sign,
        public CarbonImmutable $expiresAt,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'token' => $this->token,
            'sign' => $this->sign,
            'expires_at' => $this->expiresAt->toIso8601String(),
        ];
    }
}
