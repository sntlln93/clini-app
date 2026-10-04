<?php

declare(strict_types=1);

namespace App\Notifications\Subscriptions;

/**
 * The panel's settings page, where an owner regularizes the subscription.
 * Resolved from the first CORS origin, same as the invitation link.
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
}
