<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * A request to delete one's account (#384): pending through its grace period, then cancelled by a login, completed by
 * `accounts:complete-deletions`, or voided when something it can't resolve stood in the way at the deadline.
 */
enum AccountDeletionStatus: string
{
    case Pending = 'pending';
    case Cancelled = 'cancelled';
    case Voided = 'voided';
    case Completed = 'completed';
}
