<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\ProfessionalLicense;
use App\Models\User;

class ProfessionalLicensePolicy
{
    public function delete(User $user, ProfessionalLicense $license): bool
    {
        return $license->user_id === $user->id;
    }
}
