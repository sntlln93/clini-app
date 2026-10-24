<?php

declare(strict_types=1);

use App\Http\Controllers\ClinicalAccess\ExceptionalAccessController;
use Illuminate\Support\Facades\Route;

// The clinical access log (#325, ADR 0022). No `subscription.active`: an
// exceptional access only leads to reads, which stay open when expired.
Route::post('patients/{patient}/exceptional-accesses', [ExceptionalAccessController::class, 'store'])->whereNumber('patient');
Route::get('exceptional-accesses', [ExceptionalAccessController::class, 'index']);
