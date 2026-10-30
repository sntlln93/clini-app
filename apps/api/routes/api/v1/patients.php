<?php

declare(strict_types=1);

use App\Http\Controllers\Patients\PatientController;
use Illuminate\Support\Facades\Route;

// POST, though it only reads: a query string with the DNI would land in every proxy's access log (#322).
// Throttled per membership so the shared personal data can't be harvested by document (#365).
Route::post('patients/lookup', [PatientController::class, 'lookup'])->middleware('throttle:patient-lookup');
Route::get('patients/{patient}/appointments', [PatientController::class, 'appointmentHistory'])->whereNumber('patient');
Route::apiResource('patients', PatientController::class)->only(['index', 'store', 'show', 'update'])->whereNumber('patient');
