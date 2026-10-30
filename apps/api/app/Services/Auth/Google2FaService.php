<?php

declare(strict_types=1);

namespace App\Services\Auth;

use App\Contracts\TwoFactorAuthenticator;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\Config;
use PragmaRX\Google2FA\Google2FA;

/**
 * Adapter for `pragmarx/google2fa` (TOTP: SHA-1, 6 digits, 30-second steps,
 * what every authenticator app reads) and `bacon/bacon-qr-code` (the QR).
 */
final class Google2FaService implements TwoFactorAuthenticator
{
    // 32 base32 characters are the 160-bit secret RFC 4226 recommends.
    private const SECRET_LENGTH = 32;

    // One step either side tolerates a phone clock up to ~30 seconds off.
    private const WINDOW = 1;

    private const QR_SIZE = 192;

    public function __construct(
        private readonly Google2FA $google2fa = new Google2FA,
    ) {}

    public function generateSecret(): string
    {
        return $this->google2fa->generateSecretKey(self::SECRET_LENGTH);
    }

    public function provisioningUri(string $accountName, string $secret): string
    {
        return $this->google2fa->getQRCodeUrl(Config::string('brand.name'), $accountName, $secret);
    }

    public function qrCodeSvg(string $provisioningUri): string
    {
        $renderer = new ImageRenderer(new RendererStyle(self::QR_SIZE, 1), new SvgImageBackEnd);

        return (new Writer($renderer))->writeString($provisioningUri);
    }

    public function verify(string $secret, string $code, ?int $lastUsedStep): ?int
    {
        // With no previous step the library answers a bare `true` instead of
        // the step, so step 0 stands in for "none used yet".
        $step = $this->google2fa->verifyKeyNewer($secret, $code, $lastUsedStep ?? 0, self::WINDOW);

        return is_int($step) ? $step : null;
    }
}
