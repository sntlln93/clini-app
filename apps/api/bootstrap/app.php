<?php

declare(strict_types=1);

use App\Contracts\DomainError;
use App\Http\Middleware\ResolveCurrentOrganization;
use App\Http\Middleware\ResolvePublicOrganization;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->alias([
            'organization' => ResolveCurrentOrganization::class,
            'public-organization' => ResolvePublicOrganization::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // Single translation point: no controller or Action builds an
        // error response — every DomainError is logged with its own
        // developer-facing logContext() and serialized into the envelope
        // here. `->stop()` prevents the default reporter from also logging
        // it with a full stack trace: these are expected business failures,
        // not unexpected ones.
        $exceptions->reportable(function (DomainError $e): void {
            Log::error($e->getMessage(), $e->logContext());
        })->stop();

        $exceptions->render(fn (DomainError $e): JsonResponse => response()->json([
            'error' => [
                'code' => $e->errorCode()->value,
                'message' => $e->getMessage(),
                'context' => $e->publicContext(),
            ],
        ], $e->httpStatus()));

        // Anything left over is an unexpected failure: never leak class,
        // file, line or stack to the client. `ValidationException` and
        // Laravel's own auth/authorization/routing exceptions
        // (`AuthenticationException`, and everything already carrying an
        // intentional HTTP status via `HttpExceptionInterface` — 403/404
        // from `Gate::authorize()` or `findOrFail()`, 405 on unsupported
        // methods, 419 CSRF, 429 throttling) already render safely on
        // their own and must render byte-for-byte as before.
        $exceptions->render(function (Throwable $e, Request $request): ?JsonResponse {
            if ($e instanceof DomainError
                || $e instanceof ValidationException
                || $e instanceof AuthenticationException
                || $e instanceof HttpExceptionInterface
            ) {
                return null;
            }

            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json(['message' => 'Server Error'], 500);
        });
    })->create();
