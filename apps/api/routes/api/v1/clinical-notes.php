<?php

declare(strict_types=1);

use App\Http\Controllers\ClinicalNotes\ClinicalNoteController;
use Illuminate\Support\Facades\Route;

Route::get('appointments/{appointment}/clinical-notes', [ClinicalNoteController::class, 'index']);
Route::get('patients/{patient}/clinical-notes', [ClinicalNoteController::class, 'indexForPatient']);

// Writes are read-only while the subscription is expired (#28) or the
// organization exceeds its plan's professional limit (#237).
Route::middleware('subscription.active')->group(function (): void {
    Route::post('appointments/{appointment}/clinical-notes', [ClinicalNoteController::class, 'store']);
    Route::patch('clinical-notes/{clinicalNote}', [ClinicalNoteController::class, 'update']);
    Route::delete('clinical-notes/{clinicalNote}', [ClinicalNoteController::class, 'destroy']);
});
