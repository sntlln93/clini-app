<?php

declare(strict_types=1);

namespace App\Enums;

enum ClinicalRecordExportFormat: string
{
    case Pdf = 'pdf';
    case Json = 'json';
}
