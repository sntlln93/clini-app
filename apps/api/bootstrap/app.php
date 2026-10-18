<?php

declare(strict_types=1);

use App\Contracts\DomainError;
use App\Http\Middleware\EnsureDashboardOrigin;
use App\Http\Middleware\EnsureNotDashboardOrigin;
use App\Http\Middleware\EnsurePlanIncludes;
use App\Http\Middleware\EnsureSubscriptionActive;
use App\Http\Middleware\EnsureUserNotBlocked;
use App\Http\Middleware\ResolveCurrentOrganization;
use App\Http\Middleware\ResolvePublicOrganization;
use App\Support\SafeExceptionLog;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Database\DeadlockException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mime\Exception\RfcComplianceException;

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
            'subscription.active' => EnsureSubscriptionActive::class,
            'plan.feature' => EnsurePlanIncludes::class,
            'not-blocked' => EnsureUserNotBlocked::class,
            'admin.origin' => EnsureDashboardOrigin::class,
            'clinic.origin' => EnsureNotDashboardOrigin::class,
        ]);
        // The origin pins must run before authentication, throttling and route
        // model binding: a request from the wrong origin learns nothing (not
        // whether it is authenticated, nor whether an id exists) and never
        // consumes the admin login throttle.
        $middleware->prependToPriorityList(AuthenticatesRequests::class, EnsureDashboardOrigin::class);
        $middleware->prependToPriorityList(AuthenticatesRequests::class, EnsureNotDashboardOrigin::class);
        // The public booking throttle keys by organization, so the slug must
        // be resolved first (#299). It reads the raw route parameter, so it
        // needs no bindings either.
        $middleware->prependToPriorityList(ThrottleRequests::class, ResolvePublicOrganization::class);
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

        // These messages carry personal data (bindings, a rejected address),
        // so they are logged through SafeExceptionLog instead of by the
        // default reporter (#322).
        $exceptions->reportable(function (QueryException $e): void {
            Log::error('Database query failed.', SafeExceptionLog::forQuery($e));
        })->stop();

        // Thrown for a deadlock inside a nested transaction, with the
        // QueryException's message copied and the exception itself as previous.
        $exceptions->reportable(function (DeadlockException $e): void {
            $previous = $e->getPrevious();

            Log::error('Database query failed.', $previous instanceof QueryException
                ? SafeExceptionLog::forQuery($previous)
                : ['exception' => $e::class]);
        })->stop();

        $exceptions->reportable(function (TransportExceptionInterface $e): void {
            Log::error('Mail delivery failed.', SafeExceptionLog::forMail($e));
        })->stop();

        $exceptions->reportable(function (RfcComplianceException $e): void {
            Log::error('Mail delivery failed.', SafeExceptionLog::forMail($e));
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
