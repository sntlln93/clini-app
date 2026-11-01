<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * What the national registry last said about a professional's license (#380). `Unverified` is never an error: the
 * registry is off, didn't answer, or there is no DNI to look it up with, and nothing in the panel is blocked by it.
 */
enum ProfessionalLicenseStatus: string
{
    case Unverified = 'unverified';
    case Verified = 'verified';
    case Mismatch = 'mismatch';
}
