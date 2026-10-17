<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Team notification address
    |--------------------------------------------------------------------------
    |
    | Where a mail goes each time the landing's contact form (#248) stores a
    | request, with the visitor as Reply-To. Empty (the default) sends none:
    | the requests are always in the dashboard's Contactos module.
    |
    */

    'notification_email' => env('CONTACT_NOTIFICATION_EMAIL') ?: null,

    /*
    |--------------------------------------------------------------------------
    | Retention
    |--------------------------------------------------------------------------
    |
    | Days a closed request is kept before `model:prune` deletes it (Ley
    | 25.326: personal data is kept only while it serves its purpose). Open
    | requests are never pruned. 0 keeps closed requests forever.
    |
    */

    'retention_days' => (int) env('CONTACT_RETENTION_DAYS', 180),

];
