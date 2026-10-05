<?php

declare(strict_types=1);

namespace App\Http\Middleware\Concerns;

use Illuminate\Http\Request;

/**
 * Origin helpers shared by the two SPA pins (EnsureDashboardOrigin,
 * EnsureNotDashboardOrigin). Origins are compared as `scheme://host[:port]`,
 * the shape of `config('admin.allowed_origins')`.
 */
trait ReadsRequestOrigin
{
    /**
     * `Origin`, else the scheme+host+port of `Referer`.
     */
    protected function requestOrigin(Request $request): ?string
    {
        $origin = $this->originHeader($request);

        return $origin ?? $this->refererOrigin($request);
    }

    /**
     * @return array<int, string>
     */
    protected function dashboardOrigins(): array
    {
        /** @var array<int, string> $allowed */
        $allowed = config('admin.allowed_origins', []);

        return $allowed;
    }

    protected function originHeader(Request $request): ?string
    {
        $origin = $request->headers->get('Origin');

        return $origin === null || $origin === '' ? null : $origin;
    }

    protected function refererOrigin(Request $request): ?string
    {
        $referer = $request->headers->get('Referer');

        if ($referer === null || $referer === '') {
            return null;
        }

        $parts = parse_url($referer);

        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            return null;
        }

        $port = isset($parts['port']) ? ':'.$parts['port'] : '';

        return $parts['scheme'].'://'.$parts['host'].$port;
    }
}
