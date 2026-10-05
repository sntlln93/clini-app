<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\EmailVerificationController;
use Illuminate\Support\Facades\Route;

// `clinic.origin` keeps dashboard-origin scripts off every clinic entry
// point, the session-creating public ones included (ADR 0010).
Route::middleware('clinic.origin')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);

    Route::get('/email-verification/{token}', [EmailVerificationController::class, 'show']);
    Route::post('/email-verification/{token}', [EmailVerificationController::class, 'store']);

    // Logout stays reachable for a blocked user; every other authenticated
    // clinic route runs `not-blocked` right after `auth:sanctum`.
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])->middleware(['auth:sanctum', 'not-blocked']);
});
