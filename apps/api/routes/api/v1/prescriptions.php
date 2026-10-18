<?php

declare(strict_types=1);

use App\Http\Controllers\Prescriptions\PrescriptionAmendmentController;
use App\Http\Controllers\Prescriptions\PrescriptionController;
use Illuminate\Support\Facades\Route;

Route::get('appointments/{appointment}/prescriptions', [PrescriptionController::class, 'index']);
Route::get('patients/{patient}/prescriptions', [PrescriptionController::class, 'indexForPatient']);

// Writes are read-only while the subscription is expired (#28) or the
// organization exceeds its plan's professional limit (#237).
// Recording or amending is a paid-plan function; the reads stay open, so a
// downgraded organization keeps its prescriptions (#237).
// A record is never edited (#323, ADR 0019): it is amended.
Route::middleware(['subscription.active', 'plan.feature:prescriptions'])->group(function (): void {
    Route::post('appointments/{appointment}/prescriptions', [PrescriptionController::class, 'store']);
    Route::post('prescriptions/{prescription}/amendments', [PrescriptionAmendmentController::class, 'store']);
});
