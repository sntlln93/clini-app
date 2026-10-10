<?php

declare(strict_types=1);

use App\Http\Controllers\Appointments\AppointmentController;
use App\Http\Controllers\Appointments\WaitingRoomController;
use Illuminate\Support\Facades\Route;

Route::get('appointments', [AppointmentController::class, 'index']);
Route::get('waiting-room', [WaitingRoomController::class, 'index'])->middleware('plan.feature:waiting_room');

// Writes are read-only while the subscription is expired (#28) or the
// organization exceeds its plan's professional limit (#237).
Route::middleware('subscription.active')->group(function (): void {
    Route::post('appointments', [AppointmentController::class, 'store']);
    Route::patch('appointments/{appointment}/status', [AppointmentController::class, 'updateStatus']);
    Route::patch('appointments/{appointment}/cancel', [AppointmentController::class, 'cancel']);
    Route::post('appointments/{appointment}/reschedule', [AppointmentController::class, 'reschedule']);
});
