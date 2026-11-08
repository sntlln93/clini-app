<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ProfessionalLicense;
use App\Models\User;

class ProfessionalLicensePolicy
{
    /**
     * Adding it to Clini (#387): only its owner.
     */
    public function update(User $user, ProfessionalLicense $license): bool
    {
        return $license->user_id === $user->id;
    }

    /**
     * Taking it out of Clini: only its owner.
     */
    public function delete(User $user, ProfessionalLicense $license): bool
    {
        return $license->user_id === $user->id;
    }
}
