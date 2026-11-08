<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Key of the DNI's blind index
    |--------------------------------------------------------------------------
    |
    | A professional's DNI is stored encrypted and searched only by its blind
    | index (#417, ADR 0032): an HMAC-SHA256 of the DNI with this key, never
    | a keyless hash, whose space of DNIs is tried whole in seconds (#322).
    | Its own key: never APP_KEY nor CLINICAL_ENCRYPTION_KEY. `base64:`
    | followed by 32 random bytes. Fails closed: without it no DNI is
    | written or searched.
    |
    */

    'key' => env('DOCUMENT_INDEX_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Retired key
    |--------------------------------------------------------------------------
    |
    | Only while rotating: the previous key goes here until
    | `php artisan document-index:rotate` recomputes every index with the new
    | one. Meanwhile a search tries both, so a DNI already taken under the
    | old key can't slip in (docs/architecture/security.md).
    |
    */

    'previous_key' => env('DOCUMENT_INDEX_PREVIOUS_KEY'),

];
