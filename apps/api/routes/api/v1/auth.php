<?php

declare(strict_types=1);

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\TwoFactorChallengeController;
use App\Http\Controllers\Auth\TwoFactorController;
use Illuminate\Support\Facades\Route;

// `clinic.origin` keeps dashboard-origin scripts off every clinic entry
// point, the session-creating public ones included (ADR 0010).
Route::middleware('clinic.origin')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/login/two-factor', [TwoFactorChallengeController::class, 'store'])->middleware('throttle:two-factor-challenge');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');

    Route::get('/email-verification/{token}', [EmailVerificationController::class, 'show']);
    Route::post('/email-verification/{token}', [EmailVerificationController::class, 'store']);

    // Logout stays reachable for a blocked user; every other authenticated
    // clinic route runs `not-blocked` right after `auth:sanctum`.
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/me', [AuthController::class, 'me'])->middleware(['auth:sanctum', 'not-blocked']);

    // The signed-in user's own second factor (#357).
    Route::middleware(['auth:sanctum', 'not-blocked', 'throttle:two-factor'])->prefix('me/two-factor')->group(function (): void {
        Route::post('/', [TwoFactorController::class, 'store']);
        Route::post('/confirmation', [TwoFactorController::class, 'confirm']);
        Route::delete('/', [TwoFactorController::class, 'destroy']);
        Route::post('/recovery-codes', [TwoFactorController::class, 'regenerateRecoveryCodes']);
    });
});
