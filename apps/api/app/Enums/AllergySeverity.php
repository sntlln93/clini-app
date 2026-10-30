<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * The values are part of the panel's REST contract.
 */
enum AllergySeverity: string
{
    case Mild = 'mild';
    case Moderate = 'moderate';
    case Severe = 'severe';
}
