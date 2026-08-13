<?php

declare(strict_types=1);

use App\Http\Controllers\Professionals\ProfessionalController;
use App\Http\Controllers\Professionals\ProfessionalServiceController;
use App\Http\Controllers\Professionals\ProfessionalSpecialtyController;
use App\Http\Controllers\Professionals\UserSpecialtyController;
use Illuminate\Support\Facades\Route;

Route::get('professionals', [ProfessionalController::class, 'index']);

Route::get('users/{user}/specialties', [UserSpecialtyController::class, 'index']);
Route::post('users/{user}/specialties', [UserSpecialtyController::class, 'store']);
Route::delete('users/{user}/specialties/{specialty}', [UserSpecialtyController::class, 'destroy']);

Route::get('memberships/{membership}/specialties', [ProfessionalSpecialtyController::class, 'index']);
Route::post('memberships/{membership}/specialties', [ProfessionalSpecialtyController::class, 'store']);
Route::delete('memberships/{membership}/specialties/{specialty}', [ProfessionalSpecialtyController::class, 'destroy']);

Route::get('memberships/{membership}/services', [ProfessionalServiceController::class, 'index']);
Route::post('memberships/{membership}/services', [ProfessionalServiceController::class, 'store']);
Route::patch('memberships/{membership}/services/{service}', [ProfessionalServiceController::class, 'update']);
Route::delete('memberships/{membership}/services/{service}', [ProfessionalServiceController::class, 'destroy']);
