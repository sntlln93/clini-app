<?php

declare(strict_types=1);

namespace App\Enums;

enum AppointmentOrigin: string
{
    case Online = 'online';
    case Manual = 'manual';
}
