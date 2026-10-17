<?php

declare(strict_types=1);

use App\Http\Controllers\Contact\ContactRequestController;
use Illuminate\Support\Facades\Route;

// Public: the landing's commercial contact form (#248, ADR 0011), sent by an
// anonymous visitor with no session. Throttled per IP (`contact`).
Route::post('contact', [ContactRequestController::class, 'store'])->middleware('throttle:contact');
