<?php

declare(strict_types=1);

namespace App\Data\Memberships;

use App\Contracts\Data;

/**
 * Who a professional invitation's DNI found (#417): the registry's name and, when the DNI or the invited email already
 * has an account the membership goes to, that account.
 */
final readonly class InvitationIdentityData implements Data
{
    public function __construct(
        public int $invitationId,
        public string $documentNumber,
        public string $name,
        public ?int $userId,
    ) {}

    /**
     * Never the DNI itself.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'invitationId' => $this->invitationId,
            'name' => $this->name,
            'userId' => $this->userId,
        ];
    }
}
