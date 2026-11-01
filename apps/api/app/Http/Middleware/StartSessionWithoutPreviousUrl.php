<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Contracts\Session\Session;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;

/**
 * Laravel's StartSession, minus the "previous URL" it keeps for a web app's
 * `back()`: it stores every non-ajax GET's full URL in the session, and the
 * SPAs' axios sends no `X-Requested-With`, so the payload kept a search like
 * `/patients?q=<name or DNI>` (#358). A JSON API never redirects back.
 */
class StartSessionWithoutPreviousUrl extends StartSession
{
    protected function storeCurrentUrl(Request $request, $session): void
    {
        // Intentionally empty: see the class docblock.
    }
}
