<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\AppointmentStatus;
use App\Enums\ClinicalAccessAction;
use App\Models\Appointment;
use App\Models\ClinicalAccessLog;
use App\Models\Patient;
use App\Models\User;

/**
 * Who opens a patient's clinical history, and when it takes a reason (#325, ADR 0022).
 *
 * The relationship (`attends`) decides who may: a professional who has or had an appointment with the patient in the
 * organization, or wrote a note for them (#217), never a role. The time decides whether it takes a reason: without an
 * own appointment with the patient within `WINDOW_DAYS` of now, the history opens only after an exceptional access,
 * which keeps it open for `EXCEPTIONAL_ACCESS_MINUTES`.
 */
class ClinicalAccess
{
    public const int WINDOW_DAYS = 7;

    public const int EXCEPTIONAL_ACCESS_MINUTES = 60;

    /**
     * A read the same professional already made of the same records this recently adds nothing to the trail: reloading
     * the patient page, or coming back to it during a consultation, would otherwise repeat the row.
     */
    public const int READ_REPEAT_MINUTES = 15;

    /**
     * A cancelled or rescheduled appointment brings no consultation, so it opens nothing.
     */
    private const array CLOSED_STATUSES = [AppointmentStatus::Cancelled, AppointmentStatus::Rescheduled];

    public static function attends(User $user, Patient $patient): bool
    {
        $organizationId = app(CurrentOrganization::class)->get();
        $membership = $user->currentMembership();

        if ($organizationId === null || $membership === null) {
            return false;
        }

        return Patient::query()
            ->whereKey($patient->id)
            ->attendedBy($organizationId, $membership->id)
            ->exists();
    }

    public static function requiresReason(int $organizationId, int $membershipId, int $patientId): bool
    {
        return ! self::hasAppointmentNearNow($organizationId, $membershipId, $patientId)
            && ! self::hasOpenExceptionalAccess($organizationId, $membershipId, $patientId);
    }

    public static function hasAppointmentNearNow(int $organizationId, int $membershipId, int $patientId): bool
    {
        return Appointment::query()
            ->where('organization_id', $organizationId)
            ->where('membership_id', $membershipId)
            ->where('patient_id', $patientId)
            ->whereNotIn('status', self::CLOSED_STATUSES)
            ->whereBetween('start_at', [now()->subDays(self::WINDOW_DAYS)->utc(), now()->addDays(self::WINDOW_DAYS)->utc()])
            ->exists();
    }

    public static function lastSameRead(int $organizationId, int $membershipId, int $patientId, ClinicalAccessAction $action, ?int $appointmentId): ?ClinicalAccessLog
    {
        return ClinicalAccessLog::query()
            ->where('organization_id', $organizationId)
            ->where('membership_id', $membershipId)
            ->where('patient_id', $patientId)
            ->where('action', $action)
            ->where('appointment_id', $appointmentId)
            ->where('created_at', '>', now()->subMinutes(self::READ_REPEAT_MINUTES)->utc())
            ->latest('created_at')
            ->first();
    }

    public static function hasOpenExceptionalAccess(int $organizationId, int $membershipId, int $patientId): bool
    {
        return ClinicalAccessLog::query()
            ->where('organization_id', $organizationId)
            ->where('membership_id', $membershipId)
            ->where('patient_id', $patientId)
            ->where('action', ClinicalAccessAction::ExceptionalAccess)
            ->where('created_at', '>', now()->subMinutes(self::EXCEPTIONAL_ACCESS_MINUTES)->utc())
            ->exists();
    }
}
