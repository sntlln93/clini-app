<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Middleware\Concerns\ReadsRequestOrigin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * Pins every `/api/v1/admin/*` route to the dashboard origin(s) in
 * `config('admin.allowed_origins')`.
 *
 * The panel and the dashboard share one session cookie and the panel origin
 * is CORS-allowed with credentials, so without this check a script running
 * on the panel origin (an XSS in the larger, clinic-facing app) could ride
 * the operator's session. Browsers always send `Origin` on cross-origin
 * fetch/XHR and page scripts can't forge it; when it is absent the
 * scheme+host+port of `Referer` is used. A request with neither is rejected
 * too. See ADR 0010.
 *
 * The request must also have gone through Sanctum's stateful pipeline
 * (session + CSRF). Sanctum decides statefulness from `Referer` first and
 * this pin from `Origin` first, so a forged pair (dashboard `Origin`, foreign
 * `Referer`) would otherwise reach the login without a session or a CSRF
 * check.
 *
 * A security assertion, not a business flow: it renders as a plain
 * `403 {"message":"Forbidden."}`, with no ErrorCode. The inverse pin, for
 * clinic routes, is EnsureNotDashboardOrigin.
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
