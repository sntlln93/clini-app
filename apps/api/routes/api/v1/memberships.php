<?php

declare(strict_types=1);

use App\Http\Controllers\Memberships\MembershipController;
use App\Http\Controllers\Memberships\MembershipInvitationController;
use Illuminate\Support\Facades\Route;

Route::get('memberships', [MembershipController::class, 'index']);
Route::patch('memberships/{membership}', [MembershipController::class, 'update']);
Route::delete('memberships/{membership}', [MembershipController::class, 'destroy']);

Route::post('memberships/invitations', [MembershipInvitationController::class, 'store']);
Route::post('memberships/invitations/resend', [MembershipInvitationController::class, 'resend']);
