<?php

declare(strict_types=1);

namespace App\Providers;

use App\Contracts\HolidayProvider;
use App\Contracts\SubscriptionGateway;
use App\Services\Holidays\CalendariosNacionalesService;
use App\Services\Payments\MercadoPagoService;
use App\Support\CurrentOrganization;
use Illuminate\Support\ServiceProvider;

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

    public function boot(): void {}
}
