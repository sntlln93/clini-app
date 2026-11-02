<?php

declare(strict_types=1);

use App\Http\Controllers\Account\AccountDeletionController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\TwoFactorChallengeController;
use App\Http\Controllers\Auth\TwoFactorController;
use Illuminate\Support\Facades\Route;

// `clinic.origin` keeps dashboard-origin scripts off every clinic entry
// point, the session-creating public ones included (ADR 0010).
Route::middleware('clinic.origin')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/login/two-factor', [TwoFactorChallengeController::class, 'store'])->middleware('throttle:two-factor-challenge');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');

    // A forgotten password (#389): asking for the link and using it. Neither signs anyone in.
    Route::middleware('throttle:password-reset')->group(function (): void {
        Route::post('/password-reset-links', [PasswordResetController::class, 'store']);
        Route::post('/password-resets', [PasswordResetController::class, 'update']);
    });

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

    // The signed-in user's own password (#389): checks the current one, so it shares the two-factor settings' bucket.
    Route::put('/me/password', [PasswordController::class, 'update'])
        ->middleware(['auth:sanctum', 'not-blocked', 'throttle:two-factor']);

    // The signed-in user's own account deletion (#384): checks the password and the second factor, so it shares
    // their bucket.
    Route::post('/me/account-deletion', [AccountDeletionController::class, 'store'])
        ->middleware(['auth:sanctum', 'not-blocked', 'throttle:two-factor']);
});
