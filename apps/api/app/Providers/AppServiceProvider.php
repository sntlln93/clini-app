<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\HolidayProvider;
use App\Contracts\MedicationSource;
use App\Contracts\ProfessionalRegistry;
use App\Contracts\SubscriptionGateway;
use App\Contracts\TwoFactorAuthenticator;
use App\Http\Middleware\StartSessionWithoutPreviousUrl;
use App\Models\User;
use App\Services\Auth\Google2FaService;
use App\Services\Holidays\CalendariosNacionalesService;
use App\Services\Medications\NationalMedicationSearchService;
use App\Services\Payments\MercadoPagoService;
use App\Services\Professionals\NationalProfessionalSearchService;
use App\Support\CurrentOrganization;
use App\Support\PasswordPolicy;
use App\Support\PendingTwoFactorLogin;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Cache\Factory as CacheFactory;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Contracts\Validation\UncompromisedVerifier;
use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Session\SessionManager;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\NotPwnedVerifier;
use Illuminate\Validation\Rules\Password;
use Symfony\Component\HttpFoundation\Response;

class AppServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        HolidayProvider::class => CalendariosNacionalesService::class,
        MedicationSource::class => NationalMedicationSearchService::class,
        ProfessionalRegistry::class => NationalProfessionalSearchService::class,
        SubscriptionGateway::class => MercadoPagoService::class,
        TwoFactorAuthenticator::class => Google2FaService::class,
    ];

    public function register(): void
    {
        $this->app->singleton(CurrentOrganization::class);

        // Sanctum's stateful pipeline resolves StartSession from the
        // container, so this swaps it everywhere (#358).
        $this->app->singleton(StartSession::class, fn (Application $app): StartSession => new StartSessionWithoutPreviousUrl(
            $app->make(SessionManager::class),
            fn (): CacheFactory => $app->make(CacheFactory::class),
        ));

        // The breach check behind `PasswordPolicy` (#389) waits 30 seconds by default before letting the password
        // through; someone choosing a password shouldn't. `extend`, since the validation provider is deferred and
        // would register its own verifier over a plain binding.
        $this->app->extend(UncompromisedVerifier::class, fn (UncompromisedVerifier $verifier, Application $app): UncompromisedVerifier => new NotPwnedVerifier(
            $app->make(HttpFactory::class),
            PasswordPolicy::BREACH_CHECK_TIMEOUT_SECONDS,
        ));
    }

    public function boot(): void
    {
        // The one rule for choosing a password (#389): every entry point uses `Password::defaults()`.
        Password::defaults(fn (): Password => PasswordPolicy::rule());

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

        // The login's second step (`throttle:two-factor-challenge`, #357):
        // keyed by the account whose password already matched, so guessing
        // its 6-digit code is held to 5 tries a minute from any number of
        // IPs or sessions. Without a pending login it keys by IP and the
        // request ends in a 409 anyway.
        RateLimiter::for('two-factor-challenge', function (Request $request): Limit {
            $userId = PendingTwoFactorLogin::userId($request);

            return Limit::perMinute(5)->by($userId !== null ? 'user:'.$userId : 'ip:'.$request->ip());
        });

        // Asking for a password reset link (`throttle:password-reset`, #389): anonymous, and each request may mail the
        // address it names. Same key as `login` per minute, plus a cap per IP an hour so walking through addresses
        // can't flood mailboxes; the broker adds its own minute per account. Resetting shares the bucket.
        RateLimiter::for('password-reset', function (Request $request): array {
            $email = $request->input('email');

            return [
                Limit::perMinute(5)->by('email:'.(is_string($email) ? Str::lower(trim($email)) : '').'|'.$request->ip()),
                Limit::perHour(20)->by('ip:'.$request->ip()),
            ];
        });

        // The two-factor settings (`throttle:two-factor`, #357): each of
        // their requests checks the password or a code, so they share one
        // bucket per signed-in user.
        RateLimiter::for('two-factor', function (Request $request): Limit {
            $user = $request->user();

            return Limit::perMinute(10)->by($user instanceof User ? 'user:'.$user->id : 'ip:'.$request->ip());
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

        // Searching a patient of any practice by document (#365): roomy for
        // someone booking appointments, tight for a script walking through
        // documents to collect the personal data the platform shares. Keyed by
        // user: the throttle runs before `organization`, and a user acts
        // through a single membership anyway (ResolveCurrentOrganization), so
        // it is a bucket per membership. Never `currentMembership()` here: it
        // would memoize the organization as unresolved for the whole request.
        RateLimiter::for('patient-lookup', function (Request $request): Limit {
            $user = $request->user();

            return Limit::perMinutes(5, 30)->by($user instanceof User ? "user:{$user->id}" : "ip:{$request->ip()}");
        });

        // Searching the medication catalog (#377): a professional typing
        // asks once per pause, and a term the catalog doesn't hold reaches
        // the national medication search, whose endpoint isn't ours to load.
        // Keyed by user, never `currentMembership()` (see `patient-lookup`).
        RateLimiter::for('medication-search', function (Request $request): Limit {
            $user = $request->user();

            return Limit::perMinute(30)->by($user instanceof User ? "user:{$user->id}" : "ip:{$request->ip()}");
        });

        // Writing a professional's DNI or licenses, or checking them again
        // (#380): each one looks the DNI up in the national professional
        // search, whose form isn't ours to load. Keyed by user, never
        // `currentMembership()` (see `patient-lookup`).
        RateLimiter::for('professional-registry', function (Request $request): Limit {
            $user = $request->user();

            return Limit::perMinute(10)->by($user instanceof User ? "user:{$user->id}" : "ip:{$request->ip()}");
        });

        // Exporting the clinical history (#326): each export reads a patient's
        // whole history, or every attended patient's, so a script can't loop
        // it. Keyed by user, since it is authenticated.
        RateLimiter::for('clinical-record-export', function (Request $request): Limit {
            $user = $request->user();

            return Limit::perMinute(10)->by($user instanceof User ? "user:{$user->id}" : (string) $request->ip());
        });

        // The patient's access code (#364, ADR 0029): a redemption is checked
        // against the redeemer's own appointments with the patient, and a
        // handful of tries a minute keeps guessing a 39-bit code out of reach;
        // a resend mails the patient, so it can't be looped into a flood.
        // Keyed by user, never `currentMembership()` (see `patient-lookup`).
        RateLimiter::for('access-code-redemption', function (Request $request): Limit {
            $user = $request->user();

            return Limit::perMinute(5)->by($user instanceof User ? "user:{$user->id}" : "ip:{$request->ip()}");
        });

        RateLimiter::for('access-code-delivery', function (Request $request): Limit {
            $user = $request->user();

            return Limit::perMinute(5)->by($user instanceof User ? "user:{$user->id}" : "ip:{$request->ip()}");
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
