<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Master key of the clinical history
    |--------------------------------------------------------------------------
    |
    | Envelope encryption of the free clinical content (#391, ADR 0036): the
    | history is encrypted with a data key, and the data key, stored in
    | `clinical_encryption_keys`, is encrypted with this master key. It is
    | never APP_KEY: `base64:` followed by 32 random bytes, generated with
    | `php artisan clinical-keys:generate-master`. Fails closed: without it
    | nothing clinical is written or read. Losing it loses the history, so
    | it is kept offline too (docs/architecture/security.md).
    |
    */

    'key' => env('CLINICAL_ENCRYPTION_KEY'),

    /*
    |--------------------------------------------------------------------------
    | Retired master keys
    |--------------------------------------------------------------------------
    |
    | Only while rotating: the previous master key goes here, comma-separated,
    | until `php artisan clinical-keys:rotate` re-encrypts the data key with
    | the new one. Then it leaves the server.
    |
    */

    'previous_keys' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CLINICAL_ENCRYPTION_PREVIOUS_KEYS', '')),
    ))),

];
