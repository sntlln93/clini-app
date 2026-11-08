<?php

declare(strict_types=1);

namespace App\Data\Memberships;

use App\Contracts\Data;

/**
 * Accepting an invitation. A professional one also carries the identity its DNI found (#417) and, for an account that
 * already exists, that account's password and, if it has one, its second factor (`code`, from the authenticator app,
 * or `recoveryCode`).
 */
final readonly class InvitationAcceptanceData implements Data
{
    public function __construct(
        public string $token,
        public ?string $name,
        public ?string $password,
        public ?InvitationIdentityData $identity = null,
        public ?string $code = null,
        public ?string $recoveryCode = null,
    ) {}

    /**
     * Never the token, the password, the codes nor the DNI.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'identity' => $this->identity?->toArray(),
        ];
    }
}
