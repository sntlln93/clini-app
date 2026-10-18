<?php

declare(strict_types=1);

use App\Http\Controllers\ClinicalNotes\ClinicalNoteAmendmentController;
use App\Http\Controllers\ClinicalNotes\ClinicalNoteAnnulmentController;
use App\Http\Controllers\ClinicalNotes\ClinicalNoteController;
use Illuminate\Support\Facades\Route;

Route::get('appointments/{appointment}/clinical-notes', [ClinicalNoteController::class, 'index']);
Route::get('patients/{patient}/clinical-notes', [ClinicalNoteController::class, 'indexForPatient']);

// Writes are read-only while the subscription is expired (#28) or the
// organization exceeds its plan's professional limit (#237).
// A note is never edited or deleted (#323, ADR 0019): it is amended or annulled.
Route::middleware('subscription.active')->group(function (): void {
    Route::post('appointments/{appointment}/clinical-notes', [ClinicalNoteController::class, 'store']);
    Route::post('clinical-notes/{clinicalNote}/amendments', [ClinicalNoteAmendmentController::class, 'store']);
    Route::post('clinical-notes/{clinicalNote}/annulment', [ClinicalNoteAnnulmentController::class, 'store']);
});
