<?php

declare(strict_types=1);

use App\Http\Controllers\Medications\MedicationController;
use Illuminate\Support\Facades\Route;

// The medication catalog (#377): searched by the form that indicates medication, so it follows that form's plan. Each
// search may reach the national vademecum, hence its own limit.
Route::middleware(['plan.feature:prescriptions', 'throttle:medication-search'])->group(function (): void {
    Route::get('medications', [MedicationController::class, 'index']);
    Route::get('medications/{medicationProduct:gtin}', [MedicationController::class, 'show']);
});
