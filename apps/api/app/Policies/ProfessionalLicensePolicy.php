<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ProfessionalLicense;
use App\Models\User;

/**
 * A license is the professional's own, like their specialties (#380): it carries no organization, and only its owner
 * reads or changes it. Nobody else in a practice sees it, nor the DNI behind it.
 */
class ProfessionalLicensePolicy
{
    public function delete(User $user, ProfessionalLicense $license): bool
    {
        return $license->user_id === $user->id;
    }
}
