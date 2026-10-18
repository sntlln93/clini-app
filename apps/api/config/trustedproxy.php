<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Trusted proxies
    |--------------------------------------------------------------------------
    |
    | The proxies whose X-Forwarded-* headers the API believes (#312), read by
    | Laravel's global TrustProxies middleware: a comma-separated list of IPs
    | or CIDR ranges in TRUSTED_PROXIES, e.g. the Docker network Dokploy's
    | proxy reaches the API through (docs/architecture/infrastructure.md).
    | Behind a proxy without it, every visitor has the proxy's IP, so the
    | per-IP rate limits become global ones.
    |
    | Always an array, never null: with null the middleware trusts every
    | proxy when the request's Host ends in .on-forge.com or .on-vapor.com,
    | a header any client can send. The entries that trust whoever connects
    | ('*', '**', 'REMOTE_ADDR') are dropped, so a client reaching the API
    | without the proxy can never pick its own IP.
    |
    */

    'proxies' => array_values(array_filter(
        array_map(trim(...), explode(',', (string) env('TRUSTED_PROXIES', ''))),
        fn (string $proxy): bool => ! in_array($proxy, ['', '*', '**', 'REMOTE_ADDR'], true),
    )),

];
