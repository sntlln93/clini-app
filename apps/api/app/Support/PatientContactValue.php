<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\PatientContactType;
use libphonenumber\NumberParseException;
use libphonenumber\PhoneNumber;
use libphonenumber\PhoneNumberFormat;
use libphonenumber\PhoneNumberUtil;

/**
 * One stored form per contact, so a value typed two ways is the same contact.
 */
final class PatientContactValue
{
    private const string DEFAULT_REGION = 'AR';

    private const int ARGENTINA = 54;

    public static function normalize(PatientContactType $type, string $value): ?string
    {
        $value = trim($value);

        if ($type === PatientContactType::Email) {
            $email = mb_strtolower($value);

            return filter_var($email, FILTER_VALIDATE_EMAIL) !== false && mb_strlen($email) <= 255 ? $email : null;
        }

        $number = self::parse($value);

        if ($number === null) {
            return null;
        }

        // WhatsApp only reaches an Argentine mobile, whose E.164 form carries a 9 people rarely type.
        $national = $number->getNationalNumber() ?? '';

        if ($type === PatientContactType::Whatsapp
            && $number->getCountryCode() === self::ARGENTINA
            && ! str_starts_with($national, '9')) {
            $mobile = self::parse('+549'.$national);
            $number = $mobile ?? $number;
        }

        return PhoneNumberUtil::getInstance()->format($number, PhoneNumberFormat::E164);
    }

    public static function display(PatientContactType $type, string $value): string
    {
        if ($type === PatientContactType::Email) {
            return $value;
        }

        $number = self::parse($value);

        if ($number === null) {
            return $value;
        }

        return PhoneNumberUtil::getInstance()->format(
            $number,
            $number->getCountryCode() === self::ARGENTINA ? PhoneNumberFormat::NATIONAL : PhoneNumberFormat::INTERNATIONAL,
        );
    }

    private static function parse(string $value): ?PhoneNumber
    {
        $util = PhoneNumberUtil::getInstance();

        try {
            $number = $util->parse($value, self::DEFAULT_REGION);
        } catch (NumberParseException) {
            return null;
        }

        return $util->isValidNumber($number) ? $number : null;
    }
}
