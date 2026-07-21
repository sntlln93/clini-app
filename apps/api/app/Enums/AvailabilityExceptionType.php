<?php

declare(strict_types=1);

namespace App\Enums;

enum AvailabilityExceptionType: string
{
    case Blocked = 'blocked';
    case Extra = 'extra';
}
