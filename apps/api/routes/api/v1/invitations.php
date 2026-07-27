<?php

declare(strict_types=1);

use App\Http\Controllers\Memberships\InvitationAcceptanceController;
use Illuminate\Support\Facades\Route;

// Public: consumed by an unauthenticated invitee, before any organization
// or session context exists.
Route::get('invitations/{token}', [InvitationAcceptanceController::class, 'show']);
Route::post('invitations/{token}', [InvitationAcceptanceController::class, 'store']);
