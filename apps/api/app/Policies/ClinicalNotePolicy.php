<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\User;
use App\Support\CurrentOrganization;

/**
 * Clinical notes are authored-only (see handoff #30): access is decided
 * exclusively by membership authorship, never by a role preset. This does
 * NOT extend OrganizationScopedPolicy — that base's layer 2 (org-wide
 * permission) would let Owner/Admin/Staff read notes they didn't author,
 * which is explicitly out of scope for the MVP.
 */
class ClinicalNotePolicy
{
    public function viewAny(User $user, Appointment $appointment): bool
    {
        return $this->isAppointmentOwner($user, $appointment);
    }

    public function create(User $user, Appointment $appointment): bool
    {
        return $this->isAppointmentOwner($user, $appointment);
    }

    public function view(User $user, ClinicalNote $clinicalNote): bool
    {
        return $this->isNoteOwner($user, $clinicalNote);
    }

    public function update(User $user, ClinicalNote $clinicalNote): bool
    {
        return $this->isNoteOwner($user, $clinicalNote);
    }

    public function delete(User $user, ClinicalNote $clinicalNote): bool
    {
        return $this->isNoteOwner($user, $clinicalNote);
    }

    private function isAppointmentOwner(User $user, Appointment $appointment): bool
    {
        $organizationId = app(CurrentOrganization::class)->get();
        $membership = $user->currentMembership();

        if ($organizationId === null || $membership === null) {
            return false;
        }

        return $appointment->organization_id === $organizationId
            && $appointment->membership_id === $membership->id;
    }

    private function isNoteOwner(User $user, ClinicalNote $clinicalNote): bool
    {
        $organizationId = app(CurrentOrganization::class)->get();
        $membership = $user->currentMembership();

        if ($organizationId === null || $membership === null) {
            return false;
        }

        return $clinicalNote->organization_id === $organizationId
            && $clinicalNote->membership_id === $membership->id;
    }
}
