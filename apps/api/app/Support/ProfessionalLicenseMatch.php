<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Professionals\ProfessionalLicenseOutcomeData;
use App\Data\Professionals\RegistryLicenseData;
use App\Data\Professionals\RegistryProfessionalData;
use App\Enums\HealthProfession;
use App\Enums\ProfessionalLicenseMismatch;
use App\Enums\ProfessionalLicenseStatus;
use App\Enums\Province;

final class ProfessionalLicenseMatch
{
    private const string ENABLED = 'habilitado';

    /**
     * @param  list<RegistryProfessionalData>  $professionals
     */
    public static function outcome(string $number, Province $province, HealthProfession $profession, array $professionals): ProfessionalLicenseOutcomeData
    {
        /** @var list<array{RegistryProfessionalData, RegistryLicenseData}> $candidates */
        $candidates = [];

        foreach ($professionals as $professional) {
            foreach ($professional->licenses as $license) {
                if ($license->province === $province
                    && FoldedText::fold($license->profession) === FoldedText::fold($profession->label())
                    && self::sameNumber($license->number, $number)) {
                    $candidates[] = [$professional, $license];
                }
            }
        }

        if ($candidates === []) {
            return new ProfessionalLicenseOutcomeData(ProfessionalLicenseStatus::Mismatch, ProfessionalLicenseMismatch::NotFound, null, null);
        }

        foreach ($candidates as [$professional, $license]) {
            if (self::reason($professional, $license) === null) {
                return new ProfessionalLicenseOutcomeData(ProfessionalLicenseStatus::Verified, null, $professional->refepsCode, $license);
            }
        }

        [$professional, $license] = $candidates[0];

        return new ProfessionalLicenseOutcomeData(ProfessionalLicenseStatus::Mismatch, self::reason($professional, $license), $professional->refepsCode, $license);
    }

    public static function sameNumber(string $registered, string $declared): bool
    {
        $a = self::key($registered);
        $b = self::key($declared);

        if ($a === '' || $b === '') {
            return false;
        }

        if ($a === $b) {
            return true;
        }

        $first = self::prefixed($a);
        $second = self::prefixed($b);

        // Only a bare number and a prefixed one compare by their digits: two prefixes must be the same one.
        return $first !== null && $second !== null
            && ($first[0] === '' || $second[0] === '')
            && ltrim($first[1], '0') === ltrim($second[1], '0');
    }

    private static function reason(RegistryProfessionalData $professional, RegistryLicenseData $license): ?ProfessionalLicenseMismatch
    {
        return match (true) {
            ! $professional->active => ProfessionalLicenseMismatch::Inactive,
            $license->sanctioned => ProfessionalLicenseMismatch::Sanctioned,
            FoldedText::fold($license->situation ?? '') !== self::ENABLED => ProfessionalLicenseMismatch::NotEnabled,
            default => null,
        };
    }

    private static function key(string $number): string
    {
        return (string) preg_replace('/[^A-Z0-9]/', '', strtoupper($number));
    }

    /**
     * @return array{string, string}|null
     */
    private static function prefixed(string $key): ?array
    {
        return preg_match('/^([A-Z]*)(\d+)$/', $key, $match) === 1 ? [$match[1], $match[2]] : null;
    }
}
