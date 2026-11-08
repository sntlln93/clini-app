<?php

declare(strict_types=1);

use App\Http\Controllers\Memberships\InvitationAcceptanceController;
use App\Http\Controllers\Memberships\InvitationDocumentLookupController;
use Illuminate\Support\Facades\Route;

// Public: consumed by an unauthenticated invitee, before any organization
// or session context exists. Accepting one logs the invitee in, so it is
// kept off the dashboard origin like the other clinic entry points.
Route::middleware('clinic.origin')->group(function (): void {
    Route::get('invitations/{token}', [InvitationAcceptanceController::class, 'show']);
    // A wrong password of the account a professional invitation links to spends no DNI lookup (#417): this stops
    // guessing, per invitation and IP and per account.
    Route::post('invitations/{token}', [InvitationAcceptanceController::class, 'store'])->middleware('throttle:invitation-acceptance');
    // A professional invitation's DNI, looked up in the national registry (#417): three per invitation, and a daily
    // cap per organization.
    Route::post('invitations/{token}/document-lookups', [InvitationDocumentLookupController::class, 'store'])
        ->middleware(['throttle:professional-registry', 'throttle:invitation-document-lookup']);
});
