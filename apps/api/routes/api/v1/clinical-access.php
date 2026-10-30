<?php

declare(strict_types=1);

use App\Http\Controllers\ClinicalAccess\AccessCodeDeliveryController;
use App\Http\Controllers\ClinicalAccess\AccessCodeRedemptionController;
use App\Http\Controllers\ClinicalAccess\ClinicalAccessTrailController;
use App\Http\Controllers\ClinicalAccess\ExceptionalAccessController;
use Illuminate\Support\Facades\Route;

// The clinical access log (#325, ADR 0022). No `subscription.active`: an
// exceptional access only leads to reads, which stay open when expired, and
// a patient's trail is one of them.
Route::post('patients/{patient}/exceptional-accesses', [ExceptionalAccessController::class, 'store'])->whereNumber('patient');
Route::get('exceptional-accesses', [ExceptionalAccessController::class, 'index']);
Route::get('patients/{patient}/clinical-access-logs', [ClinicalAccessTrailController::class, 'index'])->whereNumber('patient');

// The code the patient shares so another professional's records open (#364,
// ADR 0029). Redeeming it only leads to reads, and resending it only mails
// what the booking already issued, so neither takes `subscription.active`.
Route::post('patients/{patient}/access-code-redemptions', [AccessCodeRedemptionController::class, 'store'])
    ->whereNumber('patient')
    ->middleware('throttle:access-code-redemption');
Route::post('appointments/{appointment}/access-code-deliveries', [AccessCodeDeliveryController::class, 'store'])
    ->whereNumber('appointment')
    ->middleware('throttle:access-code-delivery');
