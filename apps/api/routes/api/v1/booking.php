<?php

declare(strict_types=1);

use App\Http\Controllers\Booking\PublicAppointmentController;
use App\Http\Controllers\Booking\PublicBookingController;
use App\Http\Controllers\Booking\PublicBookingLogoController;
use Illuminate\Support\Facades\Route;

// Public: the details page the reminder links to (#320). Registered first and
// constrained to the token's shape, so it never shadows an organization slug.
Route::get('booking/appointments/{token}', [PublicAppointmentController::class, 'show'])
    ->where('token', '[A-Za-z0-9_-]{40,}');

// Public: consumed by an anonymous patient booking an appointment online,
// before any organization or session context exists. `public-organization`
// resolves the organization from {slug} and populates CurrentOrganization
// for the rest of the request, in place of the `organization` middleware
// used by the authenticated modules.
Route::prefix('booking/{slug}')->middleware('public-organization')->group(function (): void {
    Route::get('/', [PublicBookingController::class, 'show']);
    Route::get('/slots', [PublicBookingController::class, 'slots']);
    Route::get('/logo', [PublicBookingLogoController::class, 'show']);
    // Blocked like the panel's own writes (#28, #237).
    Route::post('/appointments', [PublicBookingController::class, 'store'])->middleware('subscription.active');
});
