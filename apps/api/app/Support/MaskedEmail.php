<?php

declare(strict_types=1);

namespace App\Support;

/**
 * An email shown to someone who isn't signed in as its owner (#417): its first letter and its domain, «m•••@dominio».
 */
final class MaskedEmail
{
    public static function of(string $email): string
    {
        $at = mb_strrpos($email, '@');

        if ($at === false || $at === 0) {
            return '•••';
        }

        return mb_substr($email, 0, 1).'•••'.mb_substr($email, $at);
    }
}
