<?php

declare(strict_types=1);

use App\Http\Controllers\MedicalHistory\BloodTypeController;
use App\Http\Controllers\MedicalHistory\MedicalHistoryAmendmentController;
use App\Http\Controllers\MedicalHistory\MedicalHistoryController;
use App\Http\Controllers\MedicalHistory\MedicalHistoryWithdrawalController;
use Illuminate\Support\Facades\Route;

Route::get('patients/{patient}/medical-history', [MedicalHistoryController::class, 'show']);

// Writes are read-only while the subscription is expired (#28) or the
// organization exceeds its plan's professional limit (#237). Part of the
// clinical history on every plan, as the notes (#361).
// An entry is never edited or deleted (ADR 0019): it is amended or withdrawn,
// and a blood type is changed by recording the new one (ADR 0027).
Route::middleware('subscription.active')->group(function (): void {
    Route::post('appointments/{appointment}/blood-types', [BloodTypeController::class, 'store']);
    Route::post('appointments/{appointment}/medical-history-entries', [MedicalHistoryController::class, 'store']);
    Route::post('medical-history-entries/{medicalHistoryEntry}/amendments', [MedicalHistoryAmendmentController::class, 'store']);
    Route::post('medical-history-entries/{medicalHistoryEntry}/withdrawal', [MedicalHistoryWithdrawalController::class, 'store']);
});
