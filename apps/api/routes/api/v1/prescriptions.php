<?php

declare(strict_types=1);

use App\Http\Controllers\Prescriptions\PrescriptionController;
use Illuminate\Support\Facades\Route;

Route::get('appointments/{appointment}/prescriptions', [PrescriptionController::class, 'index']);
Route::get('patients/{patient}/prescriptions', [PrescriptionController::class, 'indexForPatient']);
Route::get('prescriptions/{prescription}', [PrescriptionController::class, 'show']);

// Writes are read-only while the subscription is expired/cancelled (#28).
Route::middleware('subscription.active')->group(function (): void {
    Route::post('appointments/{appointment}/prescriptions', [PrescriptionController::class, 'store']);
    Route::patch('prescriptions/{prescription}', [PrescriptionController::class, 'update']);
});
