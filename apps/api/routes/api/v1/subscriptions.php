<?php

declare(strict_types=1);

use App\Http\Controllers\Subscriptions\SubscriptionController;
use App\Http\Controllers\Subscriptions\SubscriptionReturnController;
use Illuminate\Support\Facades\Route;

// Public: the browser lands here from Mercado Pago's checkout, with no
// guarantee of a panel session on this origin. It only redirects to the
// panel, to a fixed URL.
Route::get('subscription/return', [SubscriptionReturnController::class, 'show']);

Route::middleware(['clinic.origin', 'auth:sanctum', 'not-blocked', 'organization'])->group(function (): void {
    Route::get('subscription', [SubscriptionController::class, 'show']);
    Route::post('subscription', [SubscriptionController::class, 'store']);
});
