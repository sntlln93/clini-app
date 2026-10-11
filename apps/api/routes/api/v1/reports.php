<?php

declare(strict_types=1);

use App\Http\Controllers\Reports\ReportController;
use Illuminate\Support\Facades\Route;

Route::get('reports', [ReportController::class, 'show'])->middleware('plan.feature:reports');
