<?php

declare(strict_types=1);

use App\Http\Controllers\Memberships\MembershipController;
use Illuminate\Support\Facades\Route;

Route::get('memberships', [MembershipController::class, 'index']);
Route::patch('memberships/{membership}', [MembershipController::class, 'update']);
Route::delete('memberships/{membership}', [MembershipController::class, 'destroy']);
