<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Why indicated medication no longer counts (#344). The values are part of the panel's REST contract.
 */
enum PrescriptionAnnulmentKind: string
{
    /**
     * The treatment ended or was stopped: it was valid until the annulment.
     */
    case NoLongerNeeded = 'no_longer_needed';
    /**
     * It was indicated by mistake, e.g. to the wrong patient or in the wrong appointment: it never applied.
     */
    case NeverNeeded = 'never_needed';
}
