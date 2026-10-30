<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Time-based one-time passwords (RFC 6238) for the clinic login's second
 * factor (#357), kept apart from whatever library computes them (see
 * `App\Services\Auth`).
 */
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

    /**
     * The provisioning URI drawn as an SVG QR code.
     */
    public function qrCodeSvg(string $provisioningUri): string;

    /**
     * Returns the time step `$code` belongs to when it is valid for `$secret`
     * and newer than `$lastUsedStep`, so an accepted code can't be accepted
     * again; `null` otherwise.
     */
    public function verify(string $secret, string $code, ?int $lastUsedStep): ?int;
}
