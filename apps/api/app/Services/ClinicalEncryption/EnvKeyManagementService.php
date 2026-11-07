<?php

declare(strict_types=1);

namespace App\Services\ClinicalEncryption;

use App\Contracts\KeyManagementService;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Contracts\Encryption\EncryptException;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\Config;

/**
 * The master key of the clinical history from the environment (`CLINICAL_ENCRYPTION_KEY`), with the ones being retired
 * in `CLINICAL_ENCRYPTION_PREVIOUS_KEYS` while `clinical-keys:rotate` runs (#391, ADR 0036). AES-256-GCM, like the
 * data key it encrypts.
 */
final class EnvKeyManagementService implements KeyManagementService
{
    public const string CIPHER = 'aes-256-gcm';

    /**
     * The public key of `.env.example`, phpunit.xml and e2e, which only ever hold synthetic data.
     */
    public const string DEVELOPMENT_KEY = 'base64:Z9wcsH2BLtpHrGvaWfsbMdObTX7hq+FLxLNDGoh1K/s=';

    public function wrap(string $dataKey): string
    {
        return $this->encrypter()->encryptString($dataKey);
    }

    public function unwrap(string $wrappedKey): string
    {
        $previousKeys = array_map(
            fn (string $key): string => $this->decodeKey($key, 'CLINICAL_ENCRYPTION_PREVIOUS_KEYS', DecryptException::class),
            array_filter(Config::array('clinical_encryption.previous_keys'), is_string(...)),
        );

        return $this->encrypter()->previousKeys($previousKeys)->decryptString($wrappedKey);
    }

    private function encrypter(): Encrypter
    {
        $key = Config::get('clinical_encryption.key');

        if (! is_string($key) || $key === '') {
            throw new EncryptException('CLINICAL_ENCRYPTION_KEY is not set: generate it with `php artisan clinical-keys:generate-master`.');
        }

        // Compared as bytes: base64 has more than one spelling of the same key (padding, ignored bits, whitespace).
        $decoded = $this->decodeKey($key, 'CLINICAL_ENCRYPTION_KEY', EncryptException::class);

        // A separate key is the point (ADR 0036): APP_KEY leaks with any cookie or session compromise.
        foreach ([Config::get('app.key'), ...Config::array('app.previous_keys')] as $appKey) {
            if (is_string($appKey) && hash_equals($this->appKeyBytes($appKey), $decoded)) {
                throw new EncryptException('CLINICAL_ENCRYPTION_KEY must not be APP_KEY.');
            }
        }

        if (app()->isProduction() && hash_equals($this->decodeKey(self::DEVELOPMENT_KEY, 'DEVELOPMENT_KEY', EncryptException::class), $decoded)) {
            throw new EncryptException('CLINICAL_ENCRYPTION_KEY is the public development key: generate one with `php artisan clinical-keys:generate-master --show`.');
        }

        return new Encrypter($decoded, self::CIPHER);
    }

    /**
     * APP_KEY may also be written as raw bytes, without the `base64:` prefix.
     */
    private function appKeyBytes(string $appKey): string
    {
        return str_starts_with($appKey, 'base64:') ? (string) base64_decode(substr($appKey, 7)) : $appKey;
    }

    /**
     * @param  class-string<EncryptException|DecryptException>  $exception
     */
    private function decodeKey(string $key, string $variable, string $exception): string
    {
        $decoded = str_starts_with($key, 'base64:') ? base64_decode(substr($key, 7), true) : false;

        if ($decoded === false || ! Encrypter::supported($decoded, self::CIPHER)) {
            throw new $exception("{$variable} must be `base64:` followed by 32 random bytes.");
        }

        return $decoded;
    }
}
