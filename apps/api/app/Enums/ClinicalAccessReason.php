<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Why a professional opens a patient's history without an appointment near today (#325, ADR 0022).
 */
enum ClinicalAccessReason: string
{
    case PreparingConsultation = 'preparing_consultation';
    case StudyResult = 'study_result';
    case Emergency = 'emergency';
    /**
     * The only reason that requires the free text: on its own it says nothing.
     */
    case Other = 'other';
}
