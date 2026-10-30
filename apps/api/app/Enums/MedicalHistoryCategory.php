<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * What an entry of the patient's background is about (#361). The values are part of the panel's REST contract.
 */
enum MedicalHistoryCategory: string
{
    /** Takes a reaction and a severity besides the substance. */
    case Allergy = 'allergy';
    case Personal = 'personal';
    case Family = 'family';
    case Surgical = 'surgical';
}
