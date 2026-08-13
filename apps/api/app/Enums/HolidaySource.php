<?php

declare(strict_types=1);

namespace App\Enums;

enum HolidaySource: string
{
    case Auto = 'auto';
    case Manual = 'manual';
}
