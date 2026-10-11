<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * How the panel reports group days (#242). Weeks start on Monday.
 */
enum ReportGranularity: string
{
    case Week = 'week';
    case Month = 'month';
}
