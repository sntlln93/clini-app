<?php

declare(strict_types=1);

use App\Http\Controllers\VitalSigns\VitalSignAmendmentController;
use App\Http\Controllers\VitalSigns\VitalSignAnnulmentController;
use App\Http\Controllers\VitalSigns\VitalSignController;
use Illuminate\Support\Facades\Route;

Route::get('patients/{patient}/vital-signs', [VitalSignController::class, 'indexForPatient']);

// Writes are read-only while the subscription is expired (#28) or the
// organization exceeds its plan's professional limit (#237). Part of the
// clinical history on every plan, as the notes (#361).
// A measurement is never edited or deleted (ADR 0019): it is amended or annulled.
Route::middleware('subscription.active')->group(function (): void {
    Route::post('appointments/{appointment}/vital-signs', [VitalSignController::class, 'store']);
    Route::post('vital-signs/{vitalSign}/amendments', [VitalSignAmendmentController::class, 'store']);
    Route::post('vital-signs/{vitalSign}/annulment', [VitalSignAnnulmentController::class, 'store']);
});
