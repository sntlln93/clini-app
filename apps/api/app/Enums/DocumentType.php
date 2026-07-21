<?php

declare(strict_types=1);

namespace App\Enums;

enum DocumentType: string
{
    case Dni = 'dni';
    case Passport = 'passport';
    case InsuranceId = 'insurance_id';
}
