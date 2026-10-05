<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AuditLogController;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\OrganizationController;
use App\Http\Controllers\Admin\OrganizationSuspensionController;
use App\Http\Controllers\Admin\OverviewController;
use App\Http\Controllers\Admin\PlatformAdminController;
use App\Http\Controllers\Admin\StatsController;
use App\Http\Controllers\Admin\SubscriptionController;
use App\Http\Controllers\Admin\SubscriptionEventController;
use App\Http\Controllers\Admin\SubscriptionGraceExtensionController;
use App\Http\Controllers\Admin\UserBlockController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\UserEmailVerificationController;
use Illuminate\Support\Facades\Route;

// Platform operators (dashboard). `admin.origin` pins every route —
// login included — to the dashboard origin; `auth:admin` is the operator
// session guard, never `auth:sanctum` (ADR 0010). {subscription} is not
// implicitly bound: the controllers query it explicitly, bypassing the
// tenant scope and excluding soft-deleted organizations.
Route::prefix('admin')->middleware('admin.origin')->group(function (): void {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:admin-login');

    Route::middleware('auth:admin')->group(function (): void {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::get('overview', [OverviewController::class, 'show']);
        Route::get('stats', [StatsController::class, 'show']);
        Route::get('organizations', [OrganizationController::class, 'index']);
        Route::get('organizations/{organization}', [OrganizationController::class, 'show']);
        Route::post('organizations/{organization}/suspension', [OrganizationSuspensionController::class, 'store']);
        Route::delete('organizations/{organization}/suspension', [OrganizationSuspensionController::class, 'destroy']);
        Route::get('users', [UserController::class, 'index']);
        Route::get('users/{user}', [UserController::class, 'show']);
        Route::post('users/{user}/block', [UserBlockController::class, 'store']);
        Route::delete('users/{user}/block', [UserBlockController::class, 'destroy']);
        Route::post('users/{user}/email-verification', [UserEmailVerificationController::class, 'store']);
        Route::get('subscriptions', [SubscriptionController::class, 'index']);
        Route::get('subscriptions/{subscription}', [SubscriptionController::class, 'show'])->whereNumber('subscription');
        Route::post('subscriptions/{subscription}/grace-extension', [SubscriptionGraceExtensionController::class, 'store'])->whereNumber('subscription');
        Route::get('subscription-events', [SubscriptionEventController::class, 'index']);
        Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::get('platform-admins', [PlatformAdminController::class, 'index']);
    });
});
