<?php

declare(strict_types=1);

use App\Http\Controllers\Booking\PublicBookingController;
use Illuminate\Support\Facades\Route;

// Public: consumed by an anonymous patient booking an appointment online,
// before any organization or session context exists. `public-organization`
// resolves the organization from {slug} and populates CurrentOrganization
// for the rest of the request, in place of the `organization` middleware
// used by the authenticated modules.
Route::prefix('booking/{slug}')->middleware('public-organization')->group(function (): void {
    Route::get('/', [PublicBookingController::class, 'show']);
    Route::get('/slots', [PublicBookingController::class, 'slots']);
    Route::post('/appointments', [PublicBookingController::class, 'store']);
});
