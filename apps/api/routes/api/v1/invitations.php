<?php

declare(strict_types=1);

use App\Http\Controllers\Memberships\InvitationAcceptanceController;
use Illuminate\Support\Facades\Route;

// Public: consumed by an unauthenticated invitee, before any organization
// or session context exists. Accepting one logs the invitee in, so it is
// kept off the dashboard origin like the other clinic entry points.
Route::middleware('clinic.origin')->group(function (): void {
    Route::get('invitations/{token}', [InvitationAcceptanceController::class, 'show']);
    Route::post('invitations/{token}', [InvitationAcceptanceController::class, 'store']);
});
