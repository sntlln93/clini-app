<?php

declare(strict_types=1);

namespace App\Data\Auth;

use App\Contracts\Data;

/**
 * What the panel shows to add the account to an authenticator app: the QR
 * code, and the secret itself for typing it in by hand.
 */
final readonly class TwoFactorSecretData implements Data
{
    public function __construct(
        public string $secret,
        public string $provisioningUri,
        public string $qrCodeSvg,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'secret' => $this->secret,
            'provisioning_uri' => $this->provisioningUri,
            'qr_code_svg' => $this->qrCodeSvg,
        ];
    }
}
