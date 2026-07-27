<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    require __DIR__.'/api/v1/auth.php';
    require __DIR__.'/api/v1/health.php';

    // Invitation acceptance is consumed by an unauthenticated invitee, so
    // it stays outside the auth group like auth/health above.
    require __DIR__.'/api/v1/invitations.php';

    // Domain modules (#20–#24) mount here. Auth (login/register/logout/me)
    // and health stay outside this group: they run before an organization
    // can be resolved, or don't need one at all.
    Route::middleware(['auth:sanctum', 'organization'])->group(function (): void {
        require __DIR__.'/api/v1/patients.php';
        require __DIR__.'/api/v1/catalog.php';
        require __DIR__.'/api/v1/professionals.php';
        require __DIR__.'/api/v1/memberships.php';
        require __DIR__.'/api/v1/availability.php';
        require __DIR__.'/api/v1/appointments.php';
    });
});
