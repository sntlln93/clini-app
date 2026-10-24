<?php

declare(strict_types=1);

use App\Http\Controllers\ClinicalAccess\ClinicalAccessTrailController;
use App\Http\Controllers\ClinicalAccess\ExceptionalAccessController;
use Illuminate\Support\Facades\Route;

// The clinical access log (#325, ADR 0022). No `subscription.active`: an
// exceptional access only leads to reads, which stay open when expired, and
// a patient's trail is one of them.
Route::post('patients/{patient}/exceptional-accesses', [ExceptionalAccessController::class, 'store'])->whereNumber('patient');
Route::get('exceptional-accesses', [ExceptionalAccessController::class, 'index']);
Route::get('patients/{patient}/clinical-access-logs', [ClinicalAccessTrailController::class, 'index'])->whereNumber('patient');
