<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Online booking rate limits
    |--------------------------------------------------------------------------
    |
    | The public, anonymous booking page (#299), throttled per visitor IP and
    | per organization so abuse against one practice leaves the others alone:
    |
    | - bookings_per_organization: bookings created per hour by one IP at one
    |   organization (someone booking for their whole family fits).
    | - bookings_per_ip: bookings created per hour by one IP across every
    |   organization.
    | - attempts_per_minute: booking requests per minute by one IP, whatever
    |   their outcome (a rejected request creates nothing, but still costs).
    | - slot_searches_per_minute: slot searches per minute by one IP at one
    |   organization.
    |
    | The hourly limits are hit after the response (only then is it known
    | the booking was created), so a burst of parallel requests can get past
    | them; attempts_per_minute, hit before, bounds that.
    |
    | 0 turns a limit off. Behind a proxy without trusted-proxy config every
    | visitor shares the proxy's IP, so these become per-organization and
    | global limits (docs/architecture/infrastructure.md).
    |
    */

    'rate_limits' => [
        'bookings_per_organization' => (int) env('BOOKING_LIMIT_PER_ORGANIZATION', 5),
        'bookings_per_ip' => (int) env('BOOKING_LIMIT_PER_IP', 20),
        'attempts_per_minute' => (int) env('BOOKING_ATTEMPTS_PER_MINUTE', 10),
        'slot_searches_per_minute' => (int) env('BOOKING_SLOT_SEARCHES_PER_MINUTE', 60),
    ],

];
