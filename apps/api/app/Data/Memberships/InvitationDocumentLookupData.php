<?php

declare(strict_types=1);

namespace App\Data\Memberships;

use App\Contracts\Data;

/**
 * A DNI typed to accept a professional invitation (#417).
 */
final readonly class InvitationDocumentLookupData implements Data
{
    public function __construct(
        public string $token,
        public string $documentNumber,
    ) {}

    /**
     * Never the token nor the DNI.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [];
    }
}
