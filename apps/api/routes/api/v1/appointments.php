<?php

declare(strict_types=1);

use App\Http\Controllers\Appointments\AppointmentController;
use Illuminate\Support\Facades\Route;

Route::get('appointments', [AppointmentController::class, 'index']);
Route::post('appointments', [AppointmentController::class, 'store']);
Route::patch('appointments/{appointment}/status', [AppointmentController::class, 'updateStatus']);
