<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Illuminate\Contracts\Session\Session;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;

/**
 * The SPAs' axios sends no `X-Requested-With`, so every GET's full URL (a
 * `/patients?q=<DNI>` search) landed in the session for a `back()` never used.
 */
class StartSessionWithoutPreviousUrl extends StartSession
{
    protected function storeCurrentUrl(Request $request, $session): void
    {
        // Intentionally empty.
    }
}
