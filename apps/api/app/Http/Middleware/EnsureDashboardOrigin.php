<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Middleware\Concerns\ReadsRequestOrigin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Pins admin routes to the dashboard origin (ADR 0010). The `sanctum` check
 * stops a forged pair (dashboard `Origin`, foreign `Referer`) skipping session
 * and CSRF. A security 403, no ErrorCode.
 */
class EnsureDashboardOrigin
{
    use ReadsRequestOrigin;

    public function handle(Request $request, Closure $next): Response
    {
        $origin = $this->requestOrigin($request);

        if ($origin === null
            || ! in_array($origin, $this->dashboardOrigins(), true)
            || $request->attributes->get('sanctum') !== true
        ) {
            throw new AccessDeniedHttpException('Forbidden.');
        }

        return $next($request);
    }
}
