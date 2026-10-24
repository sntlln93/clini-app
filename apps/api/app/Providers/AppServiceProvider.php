<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\HolidayProvider;
use App\Contracts\PdfRenderer;
use App\Contracts\SubscriptionGateway;
use App\Models\User;
use App\Services\Holidays\CalendariosNacionalesService;
use App\Services\Payments\MercadoPagoService;
use App\Services\Pdf\DompdfService;
use App\Support\CurrentOrganization;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AppServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        HolidayProvider::class => CalendariosNacionalesService::class,
        SubscriptionGateway::class => MercadoPagoService::class,
        PdfRenderer::class => DompdfService::class,
    ];

    public function register(): void
    {
        $this->app->singleton(CurrentOrganization::class);
    }

    public function boot(): void
    {
        // Platform-operator login (`throttle:admin-login`): 5 attempts per
        // minute per email + IP. Behind a proxy not in TRUSTED_PROXIES
        // (config/trustedproxy.php) the IP is the proxy's, so it degrades to
        // per-email.
        // The key is normalized like Admin\LoginRequest's input (trim +
        // lowercase), so padding the email can't open a fresh bucket for the
        // same account; a non-string email keys as empty and is left for the
        // FormRequest to reject with a 422.
        RateLimiter::for('admin-login', function (Request $request): Limit {
            $email = $request->input('email');

            return Limit::perMinute(5)
                ->by((is_string($email) ? Str::lower(trim($email)) : '').'|'.$request->ip());
        });

        // Clinic login (`throttle:login`, #336): same key and limit as
        // `admin-login` above, in its own bucket.
        RateLimiter::for('login', function (Request $request): Limit {
            $email = $request->input('email');

            return Limit::perMinute(5)
                ->by((is_string($email) ? Str::lower(trim($email)) : '').'|'.$request->ip());
        });

        // The landing's contact form (`throttle:contact`, #248): 5 per minute
        // and 20 per hour per IP. Behind a proxy not in TRUSTED_PROXIES every
        // visitor shares the proxy's IP, so the limits become global
        // (docs/architecture/infrastructure.md).
        RateLimiter::for('contact', fn (Request $request): array => [
            Limit::perMinute(5)->by($request->ip()),
            Limit::perHour(20)->by($request->ip()),
        ]);

        // Account sign-up (`throttle:register`, #299): anonymous, and each
        // request creates an organization and mails an address the caller
        // picks. Same limits and proxy caveat as `contact`.
        RateLimiter::for('register', fn (Request $request): array => [
            Limit::perMinute(5)->by($request->ip()),
            Limit::perHour(20)->by($request->ip()),
        ]);

        // Exporting the clinical history (#326): each export reads a patient's
        // whole history, or every attended patient's, so a script can't loop
        // it. Keyed by user, since it is authenticated.
        RateLimiter::for('clinical-record-export', function (Request $request): Limit {
            $user = $request->user();

            return Limit::perMinute(10)->by($user instanceof User ? "user:{$user->id}" : (string) $request->ip());
        });

        // The public booking page (#299), values in config/booking.php.
        // `public-organization` runs before the throttle (bootstrap/app.php),
        // so the organization is resolved: its two slugs (the practice's and
        // a professional's) share one bucket, and an unknown slug never opens
        // one. Only a created booking counts against the hourly limits, so a
        // rejected attempt (a typo, a slot just taken) doesn't use them up.
        RateLimiter::for('public-booking', function (Request $request): array {
            $organization = app(CurrentOrganization::class)->get();
            $created = fn (Response $response): bool => $response->getStatusCode() === 201;

            return array_values(array_filter([
                self::limit(Limit::perHour(...), 'booking.rate_limits.bookings_per_organization')
                    ?->by("organization:{$organization}|{$request->ip()}")->after($created),
                self::limit(Limit::perHour(...), 'booking.rate_limits.bookings_per_ip')
                    ?->by("ip:{$request->ip()}")->after($created),
                self::limit(Limit::perMinute(...), 'booking.rate_limits.attempts_per_minute')
                    ?->by("attempts:{$request->ip()}"),
            ]));
        });

        RateLimiter::for('public-booking-slots', function (Request $request): Limit {
            $organization = app(CurrentOrganization::class)->get();

            return self::limit(Limit::perMinute(...), 'booking.rate_limits.slot_searches_per_minute')
                ?->by("organization:{$organization}|{$request->ip()}") ?? Limit::none();
        });
    }

    /**
     * The limit configured under `$key`, or null when it is 0 (off).
     *
     * @param  callable(int): Limit  $period
     */
    private static function limit(callable $period, string $key): ?Limit
    {
        $maxAttempts = Config::integer($key);

        return $maxAttempts > 0 ? $period($maxAttempts) : null;
    }
}
