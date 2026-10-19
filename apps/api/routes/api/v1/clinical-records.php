<?php

declare(strict_types=1);

use App\Http\Controllers\ClinicalRecords\ClinicalRecordExportController;
use Illuminate\Support\Facades\Route;

// Exporting the clinical history (#326, ADR 0021). Reads, so no
// `subscription.active`: an expired practice can still take its history.
Route::middleware('throttle:clinical-record-export')->group(function (): void {
    Route::get('patients/{patient}/clinical-record', [ClinicalRecordExportController::class, 'patient'])->whereNumber('patient');
    Route::get('clinical-record/attended-patients', [ClinicalRecordExportController::class, 'attended']);
});
