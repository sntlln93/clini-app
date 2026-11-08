<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\Config;
use LogicException;

/**
 * The blind index of a professional's DNI (#417, ADR 0032): HMAC-SHA256 of the DNI, written as digits without leading
 * zeros, keyed with `DOCUMENT_INDEX_KEY`. The DNI itself stays encrypted in `users.document_number`; a DNI is searched
 * only through this index, and while a key is being retired (`DOCUMENT_INDEX_PREVIOUS_KEY`) a search tries both.
 */
final class DocumentIndex
{
    /**
     * The public key of `.env.example`, phpunit.xml and e2e, which only ever hold synthetic data. Production refuses it.
     */
    public const string DEVELOPMENT_KEY = 'base64:MDmagDRu2evj8blOAurb30SMlfrwNAUyzKJhtfkbeU8=';

    /**
     * The DNI as the registry compares it: digits only, without leading zeros.
     */
    public static function normalize(string $documentNumber): string
    {
        return ltrim((string) preg_replace('/\D/', '', $documentNumber), '0');
    }

    /**
     * The index under the current key: the one written.
     */
    public static function of(string $documentNumber): string
    {
        return self::hash($documentNumber, self::key('DOCUMENT_INDEX_KEY', Config::get('document_index.key')));
    }

    /**
     * Every index the DNI may be stored under: the current key's and, while rotating, the previous key's.
     *
     * @return list<string>
     */
    public static function candidates(string $documentNumber): array
    {
        $candidates = [self::of($documentNumber)];
        $previous = Config::get('document_index.previous_key');

        if (is_string($previous) && $previous !== '') {
            $candidates[] = self::hash($documentNumber, self::key('DOCUMENT_INDEX_PREVIOUS_KEY', $previous));
        }

        return array_values(array_unique($candidates));
    }

    private static function hash(string $documentNumber, string $key): string
    {
        return hash_hmac('sha256', self::normalize($documentNumber), $key);
    }

    /**
     * The key's bytes, refusing a missing or short key, one shared with another secret, and the public one in
     * production.
     */
    private static function key(string $variable, mixed $key): string
    {
        $decoded = is_string($key) && str_starts_with($key, 'base64:') ? base64_decode(substr($key, 7), true) : false;

        if (! is_string($decoded) || strlen($decoded) < 32) {
            throw new LogicException("{$variable} must be `base64:` followed by 32 random bytes: generate it with `php artisan document-index:generate-key`.");
        }

        foreach ([Config::get('app.key'), Config::get('clinical_encryption.key')] as $other) {
            if (is_string($other) && $other !== '' && hash_equals(self::bytes($other), $decoded)) {
                throw new LogicException("{$variable} must be its own key, never APP_KEY nor CLINICAL_ENCRYPTION_KEY.");
            }
        }

        if (app()->isProduction() && hash_equals(self::bytes(self::DEVELOPMENT_KEY), $decoded)) {
            throw new LogicException("{$variable} is the public development key: generate one with `php artisan document-index:generate-key`.");
        }

        return $decoded;
    }

    /**
     * A key written with or without the `base64:` prefix, as bytes.
     */
    private static function bytes(string $key): string
    {
        return str_starts_with($key, 'base64:') ? (string) base64_decode(substr($key, 7)) : $key;
    }
}
