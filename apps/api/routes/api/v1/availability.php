<?php

declare(strict_types=1);

use App\Http\Controllers\Availability\AvailabilityController;
use App\Http\Controllers\Availability\AvailabilityExceptionController;
use Illuminate\Support\Facades\Route;

Route::get('memberships/{membership}/availabilities', [AvailabilityController::class, 'index']);
Route::post('memberships/{membership}/availabilities', [AvailabilityController::class, 'store']);
Route::patch('availabilities/{availability}', [AvailabilityController::class, 'update']);
Route::delete('availabilities/{availability}', [AvailabilityController::class, 'destroy']);

Route::get('availability-exceptions', [AvailabilityExceptionController::class, 'index']);
Route::post('availability-exceptions', [AvailabilityExceptionController::class, 'store']);
Route::patch('availability-exceptions/{availabilityException}', [AvailabilityExceptionController::class, 'update']);
Route::delete('availability-exceptions/{availabilityException}', [AvailabilityExceptionController::class, 'destroy']);
