<?php

declare(strict_types=1);

use App\Http\Controllers\Patients\PatientController;
use Illuminate\Support\Facades\Route;

Route::get('patients/lookup', [PatientController::class, 'lookup']);
Route::apiResource('patients', PatientController::class)->only(['index', 'store', 'show', 'update']);
