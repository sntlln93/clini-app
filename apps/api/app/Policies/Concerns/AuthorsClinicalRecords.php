<?php

declare(strict_types=1);

namespace App\Policies\Concerns;

use App\Models\Appointment;
use App\Models\User;
use App\Support\CurrentOrganization;

trait AuthorsClinicalRecords
{
    private function isAppointmentOwner(User $user, Appointment $appointment): bool
    {
        return $this->actsAs($user, $appointment->organization_id, $appointment->membership_id);
    }

    private function actsAs(User $user, int $organizationId, int $membershipId): bool
    {
        $currentOrganizationId = app(CurrentOrganization::class)->get();
        $membership = $user->currentMembership();

        if ($currentOrganizationId === null || $membership === null) {
            return false;
        }

        return $organizationId === $currentOrganizationId && $membershipId === $membership->id;
    }
}
