<?php

declare(strict_types=1);

use App\Http\Controllers\Subscriptions\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::get('subscription', [SubscriptionController::class, 'show']);
Route::post('subscription', [SubscriptionController::class, 'store']);
