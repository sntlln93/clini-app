<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Where a commercial contact request stands (#248). The team answers outside
 * Clini (mail, phone); the dashboard only tracks this.
 */
enum ContactRequestStatus: string
{
    case New = 'new';
    case InProgress = 'in_progress';
    case Closed = 'closed';
}
