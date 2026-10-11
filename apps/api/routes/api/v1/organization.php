<?php

declare(strict_types=1);

use App\Http\Controllers\Organizations\OrganizationLogoController;
use Illuminate\Support\Facades\Route;

Route::get('organization/logo', [OrganizationLogoController::class, 'show']);
// POST, not PUT: PHP only parses multipart bodies on POST.
Route::post('organization/logo', [OrganizationLogoController::class, 'store']);
Route::delete('organization/logo', [OrganizationLogoController::class, 'destroy']);
