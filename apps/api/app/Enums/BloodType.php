<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * ABO group and Rh factor in one value (#361). The values are part of the panel's REST contract.
 */
enum BloodType: string
{
    case APositive = 'A+';
    case ANegative = 'A-';
    case BPositive = 'B+';
    case BNegative = 'B-';
    case AbPositive = 'AB+';
    case AbNegative = 'AB-';
    case OPositive = 'O+';
    case ONegative = 'O-';
}
