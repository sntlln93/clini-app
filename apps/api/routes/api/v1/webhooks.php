<?php

declare(strict_types=1);

use App\Http\Controllers\Subscriptions\MercadoPagoWebhookController;
use Illuminate\Support\Facades\Route;

// Public: called server-to-server by Mercado Pago, with no session, Origin
// or CSRF token. Authenticity comes from the `x-signature` header, verified
// in HandleSubscriptionNotificationAction.
Route::post('webhooks/mercadopago', [MercadoPagoWebhookController::class, 'store'])
    ->middleware('throttle:120,1');
