<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Middleware\Concerns\ReadsRequestOrigin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * The inverse of EnsureDashboardOrigin (ADR 0010). A request with neither
 * header (a non-browser client) falls through to the route's own auth. A
 * security 403, no ErrorCode.
 */
class EnsureNotDashboardOrigin
{
    use ReadsRequestOrigin;

    public function handle(Request $request, Closure $next): Response
    {
        $dashboard = $this->dashboardOrigins();

        foreach ([$this->originHeader($request), $this->refererOrigin($request)] as $origin) {
            if ($origin !== null && in_array($origin, $dashboard, true)) {
                throw new AccessDeniedHttpException('Forbidden.');
            }
        }

        return $next($request);
    }
}
