<?php

declare(strict_types=1);

namespace App\Support;

use App\Data\Professionals\RegistryProfessionalData;

/**
 * A professional's name as Clini writes it from the registry's `nombre` and `apellido` (#417): «Nombre Apellido», each
 * word with its first letter capitalized and the rest in lowercase, particles included («De La Fuente»). Anything else
 * (an accent the registry leaves out, a name the person doesn't use) is support's to fix, with `user:rename`.
 */
final class RegistryPersonName
{
    /**
     * Null when the registry gave neither part.
     */
    public static function format(?string $givenNames, ?string $surname): ?string
    {
        $words = preg_split('/\s+/u', trim(($givenNames ?? '').' '.($surname ?? '')), flags: PREG_SPLIT_NO_EMPTY);

        if ($words === false || $words === []) {
            return null;
        }

        return implode(' ', array_map(self::word(...), $words));
    }

    /**
     * The name of whoever the registry answered with, if it gave one.
     *
     * @param  list<RegistryProfessionalData>  $professionals
     */
    public static function of(array $professionals): ?string
    {
        foreach ($professionals as $professional) {
            if ($professional->name !== null) {
                return $professional->name;
            }
        }

        return null;
    }

    /**
     * A hyphenated word capitalizes each part («Pérez-Gómez»).
     */
    private static function word(string $word): string
    {
        return implode('-', array_map(
            fn (string $part): string => mb_strtoupper(mb_substr($part, 0, 1)).mb_strtolower(mb_substr($part, 1)),
            explode('-', $word),
        ));
    }
}
