<?php

declare(strict_types=1);

use App\Http\Controllers\ClinicalNotes\ClinicalNoteController;
use Illuminate\Support\Facades\Route;

Route::get('appointments/{appointment}/clinical-notes', [ClinicalNoteController::class, 'index']);
Route::get('patients/{patient}/clinical-notes', [ClinicalNoteController::class, 'indexForPatient']);
Route::post('appointments/{appointment}/clinical-notes', [ClinicalNoteController::class, 'store']);
Route::patch('clinical-notes/{clinicalNote}', [ClinicalNoteController::class, 'update']);
Route::delete('clinical-notes/{clinicalNote}', [ClinicalNoteController::class, 'destroy']);
