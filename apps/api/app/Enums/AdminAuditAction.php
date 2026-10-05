<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Every operator action recorded in `admin_audit_logs`; values are part of
 * the dashboard's REST contract (audit filter and labels).
 */
enum AdminAuditAction: string
{
    case AuthLogin = 'auth.login';
    case AuthLogout = 'auth.logout';
    case OrganizationSuspended = 'organizations.suspend';
    case OrganizationReactivated = 'organizations.reactivate';
    case UserEmailVerified = 'users.verify_email';
    case UserBlocked = 'users.block';
    case UserUnblocked = 'users.unblock';
    case SubscriptionGraceExtended = 'subscriptions.extend_grace';
}
