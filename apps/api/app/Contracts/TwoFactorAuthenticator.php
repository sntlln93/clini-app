<?php

declare(strict_types=1);

namespace App\Contracts;

interface TwoFactorAuthenticator
{
    /**
     * A new base32 shared secret for an authenticator app.
     */
    public function generateSecret(): string;

    /**
     * The `otpauth://` URI an authenticator app reads from the QR code.
     */
    public function provisioningUri(string $accountName, string $secret): string;

    public function qrCodeSvg(string $provisioningUri): string;

    /**
     * The code's time step when valid and newer than `$lastUsedStep` (so it can't be replayed); `null` otherwise.
     */
    public function verify(string $secret, string $code, ?int $lastUsedStep): ?int;
}
