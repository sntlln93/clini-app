<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Every API answer is `no-store` unless it declares itself `public` (the
 * booking page's logo). Symfony's default, `no-cache, private`, still lets
 * the browser keep a patient read on disk after the session ends (Res. AAIP
 * 47/2018, A.2.2; docs/architecture/security.md).
 */
class PreventResponseCaching
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $response->headers->hasCacheControlDirective('public')) {
            $response->headers->set('Cache-Control', 'no-store, private');
        }

        return $response;
    }
}
