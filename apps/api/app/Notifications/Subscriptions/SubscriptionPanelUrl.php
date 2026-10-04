<?php

declare(strict_types=1);

namespace App\Notifications\Subscriptions;

/**
 * The panel's settings page, where an owner regularizes the subscription.
 * Resolved from the first CORS origin (FRONTEND_URL), same as the
 * invitation link.
 */
final class SubscriptionPanelUrl
{
    public static function settings(): string
    {
        /** @var array<int, string> $allowedOrigins */
        $allowedOrigins = config('cors.allowed_origins', []);
        $frontendUrl = $allowedOrigins[0] ?? 'http://localhost:5174';

        return rtrim($frontendUrl, '/').'/ajustes';
    }

    /**
     * Where the browser lands after the provider's checkout: the settings
     * page, flagged so it waits for the payment confirmation. Fixed — never
     * built from request input — so the return route can't redirect
     * anywhere else.
     */
    public static function checkoutReturn(): string
    {
        return self::settings().'?suscripcion=retorno';
    }
}
