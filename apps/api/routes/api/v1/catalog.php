<?php

declare(strict_types=1);

use App\Http\Controllers\Catalog\InsuranceProviderController;
use App\Http\Controllers\Catalog\ServiceController;
use App\Http\Controllers\Catalog\SpecialtyController;
use Illuminate\Support\Facades\Route;

Route::get('insurance-providers', [InsuranceProviderController::class, 'index']);
Route::get('specialties', [SpecialtyController::class, 'index']);
Route::get('services', [ServiceController::class, 'index']);
