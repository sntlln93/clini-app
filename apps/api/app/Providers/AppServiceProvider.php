<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\HolidayProvider;
use App\Contracts\SubscriptionGateway;
use App\Services\Holidays\CalendariosNacionalesService;
use App\Services\Payments\MercadoPagoService;
use App\Support\CurrentOrganization;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        HolidayProvider::class => CalendariosNacionalesService::class,
        SubscriptionGateway::class => MercadoPagoService::class,
    ];

    public function register(): void
    {
        $this->app->singleton(CurrentOrganization::class);
    }

    public function boot(): void
    {
        // Platform-operator login (`throttle:admin-login`): 5 attempts per
        // minute per email + IP. Behind a proxy without trusted-proxy config
        // the IP is the proxy's, so it degrades to per-email.
        // The key is normalized like Admin\LoginRequest's input (trim +
        // lowercase), so padding the email can't open a fresh bucket for the
        // same account; a non-string email keys as empty and is left for the
        // FormRequest to reject with a 422.
        RateLimiter::for('admin-login', function (Request $request): Limit {
            $email = $request->input('email');

            return Limit::perMinute(5)
                ->by((is_string($email) ? Str::lower(trim($email)) : '').'|'.$request->ip());
        });
    }
}
