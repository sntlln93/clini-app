<?php

declare(strict_types=1);

use App\Http\Controllers\Catalog\InsuranceProviderController;
use Illuminate\Support\Facades\Route;

Route::get('insurance-providers', [InsuranceProviderController::class, 'index']);
