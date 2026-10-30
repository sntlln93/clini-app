<?php

declare(strict_types=1);

namespace App\Enums;

enum PatientContactType: string
{
    case Phone = 'phone';
    case Email = 'email';
    case Whatsapp = 'whatsapp';
}
