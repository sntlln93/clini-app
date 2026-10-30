<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Which of the national vademecum's inputs a search filled (#377): a professional may type either name, and ANMAT keeps
 * them in separate fields.
 */
enum MedicationSearchField: string
{
    case Commercial = 'commercial';
    case Generic = 'generic';
}
