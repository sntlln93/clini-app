<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Middleware\Concerns\ReadsRequestOrigin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * The inverse of EnsureDashboardOrigin: keeps the dashboard origin(s) in
 * `config('admin.allowed_origins')` off every clinic entry point.
 *
 * The dashboard origin is CORS-allowed with credentials and Sanctum-stateful
 * for all of `api/*`, and both SPAs share one session cookie (ADR 0010), so
 * without this pin a script running on the dashboard origin could read
 * patient and clinical data through an operator's clinic session in the same
 * browser. A request is rejected when either its `Origin` or the
 * scheme+host+port of its `Referer` is a dashboard origin; one with neither
 * header (a non-browser client) falls through to the route's own auth.
 *
 * A security assertion, not a business flow: it renders as a plain
 * `403 {"message":"Forbidden."}`, with no ErrorCode.
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
