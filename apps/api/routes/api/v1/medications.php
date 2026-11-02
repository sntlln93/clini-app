<?php

declare(strict_types=1);

use App\Http\Controllers\Medications\MedicationController;
use App\Http\Controllers\Medications\MedicationSubstanceController;
use Illuminate\Support\Facades\Route;

// The medication catalog (#377): searched by the form that indicates medication, so it follows that form's plan. Each
// search may reach the national medication search, hence its own limit.
Route::middleware(['plan.feature:prescriptions', 'throttle:medication-search'])->group(function (): void {
    Route::get('medications', [MedicationController::class, 'index']);
});

// Its substances (#383), searched while recording an allergy, which every plan has. Same limit: each search may reach
// the national medication search too.
Route::middleware('throttle:medication-search')->group(function (): void {
    Route::get('medication-substances', [MedicationSubstanceController::class, 'index']);
});
