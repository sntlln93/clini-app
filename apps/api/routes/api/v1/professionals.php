<?php

declare(strict_types=1);

use App\Http\Controllers\Professionals\UserSpecialtyController;
use Illuminate\Support\Facades\Route;

Route::get('users/{user}/specialties', [UserSpecialtyController::class, 'index']);
Route::post('users/{user}/specialties', [UserSpecialtyController::class, 'store']);
Route::delete('users/{user}/specialties/{specialty}', [UserSpecialtyController::class, 'destroy']);
