<?php

declare(strict_types=1);

use App\Http\Controllers\Prescriptions\PrescriptionController;
use Illuminate\Support\Facades\Route;

Route::get('appointments/{appointment}/prescriptions', [PrescriptionController::class, 'index']);
Route::get('patients/{patient}/prescriptions', [PrescriptionController::class, 'indexForPatient']);
Route::post('appointments/{appointment}/prescriptions', [PrescriptionController::class, 'store']);
Route::get('prescriptions/{prescription}', [PrescriptionController::class, 'show']);
Route::patch('prescriptions/{prescription}', [PrescriptionController::class, 'update']);
