<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * What an audit row is about. Stored as a plain string, not a morph type,
 * so renaming a model class never rewrites the audit history.
 */
enum AdminAuditSubject: string
{
    case Organization = 'organization';
    case User = 'user';
    case Subscription = 'subscription';
}
