<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Reporting timezone
    |--------------------------------------------------------------------------
    |
    | The app runs in UTC; platform aggregates (overview series, stats) bucket
    | by local day in this timezone, and the grace-extension date bounds use
    | its "today". Every response echoes the timezone it used. It must equal
    | REPORTING_TIMEZONE in apps/dashboard/src/lib/format.ts, which formats
    | dates and bounds the grace date input with it (a rebuild to change).
    |
    */

    'reporting_timezone' => env('ADMIN_REPORTING_TIMEZONE', 'America/Argentina/Buenos_Aires'),

    /*
    |--------------------------------------------------------------------------
    | Allowed dashboard origins
    |--------------------------------------------------------------------------
    |
    | `scheme://host[:port]` of the dashboard SPA(s) only — never the panel.
    | The session cookie is shared between both SPAs, so every /admin route
    | rejects any other Origin/Referer (EnsureDashboardOrigin, ADR 0010), and
    | every clinic entry point rejects these (EnsureNotDashboardOrigin).
    | Fails closed: an empty value rejects every admin request.
    |
    */

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('ADMIN_ALLOWED_ORIGINS', 'http://localhost:5175')),
    ))),

];
