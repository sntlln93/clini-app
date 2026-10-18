<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * One patient, or every patient the exporting membership attended (#326).
 */
enum ClinicalRecordExportScope: string
{
    case Patient = 'patient';
    case AttendedPatients = 'attended_patients';
}
