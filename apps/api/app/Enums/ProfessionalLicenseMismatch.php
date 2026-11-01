<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Why the national registry doesn't back a license (#380), most decisive first when a license fails for several.
 */
enum ProfessionalLicenseMismatch: string
{
    /** The registry has no license with that number, province and profession for the DNI. */
    case NotFound = 'not_found';

    /** The professional is not active in the registry. */
    case Inactive = 'inactive';

    /** The license carries a sanction that hasn't ended. */
    case Sanctioned = 'sanctioned';

    /** The license's situation isn't «Habilitado». */
    case NotEnabled = 'not_enabled';
}
