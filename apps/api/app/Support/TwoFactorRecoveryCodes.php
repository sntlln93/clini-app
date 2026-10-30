<?php

declare(strict_types=1);

namespace App\Support;

/**
 * One-time recovery codes for a lost authenticator (#357): `xxxxx-xxxxx`
 * from an alphabet without look-alike characters, compared ignoring case,
 * spaces and the dash, so a code read aloud or retyped still matches.
 */
final class TwoFactorRecoveryCodes
{
    public const COUNT = 8;

    private const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

    private const HALF_LENGTH = 5;

    /**
     * @return list<string>
     */
    public static function generate(): array
    {
        return array_map(
            fn (): string => self::randomHalf().'-'.self::randomHalf(),
            range(1, self::COUNT),
        );
    }

    /**
     * The position of `$candidate` among `$codes`, or `null` when it matches
     * none. Every code is compared in constant time.
     *
     * @param  list<string>  $codes
     */
    public static function find(array $codes, string $candidate): ?int
    {
        $normalized = self::normalize($candidate);
        $match = null;

        foreach ($codes as $index => $code) {
            if (hash_equals(self::normalize($code), $normalized) && $match === null) {
                $match = $index;
            }
        }

        return $match;
    }

    private static function normalize(string $code): string
    {
        return strtolower((string) preg_replace('/[\s-]+/', '', $code));
    }

    private static function randomHalf(): string
    {
        $half = '';
        $last = strlen(self::ALPHABET) - 1;

        for ($i = 0; $i < self::HALF_LENGTH; $i++) {
            $half .= self::ALPHABET[random_int(0, $last)];
        }

        return $half;
    }
}
