<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\AppointmentStatus;
use App\Enums\ClinicalAccessAction;
use App\Models\Appointment;
use App\Models\BloodTypeRecord;
use App\Models\ClinicalAccessLog;
use App\Models\ClinicalNote;
use App\Models\MedicalHistoryEntry;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use App\Models\VitalSign;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Facades\DB;

/** Who opens a patient's clinical history, and when it takes a reason (ADR 0022, ADR 0029). */
class ClinicalAccess
{
    public const int WINDOW_DAYS = 7;

    public const int EXCEPTIONAL_ACCESS_MINUTES = 60;

    /** A repeat read this recent (a reload during a consultation) adds no row to the trail. */
    public const int READ_REPEAT_MINUTES = 15;

    /** A cancelled or rescheduled appointment brings no consultation, so it opens nothing. */
    public const array CLOSED_STATUSES = [AppointmentStatus::Cancelled, AppointmentStatus::Rescheduled];

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

    public static function holdsCode(int $membershipId, int $patientId): bool
    {
        return self::redeemedCodes(DB::query(), $membershipId)
            ->where('patient_access_codes.patient_id', $patientId)
            ->exists();
    }

    /** What the code would open: the panel asks for it, and booking mails it, only when there is something. */
    public static function hasRecordsByOthers(int $organizationId, int $membershipId, int $patientId): bool
    {
        foreach ([ClinicalNote::class, Prescription::class, VitalSign::class, BloodTypeRecord::class, MedicalHistoryEntry::class] as $model) {
            $exists = $model::query()
                ->withoutGlobalScope('organization')
                ->where('organization_id', $organizationId)
                ->where('patient_id', $patientId)
                ->where('membership_id', '!=', $membershipId)
                ->exists();

            if ($exists) {
                return true;
            }
        }

        return false;
    }

    /** Redeemed codes that still open something, as a subquery the caller narrows to its patients. */
    public static function redeemedCodes(QueryBuilder $query, int $membershipId): QueryBuilder
    {
        return $query->selectRaw('1')
            ->from('patient_access_codes')
            ->join('appointments', 'appointments.id', '=', 'patient_access_codes.appointment_id')
            ->where('patient_access_codes.membership_id', $membershipId)
            ->whereNotNull('patient_access_codes.redeemed_at')
            ->where('patient_access_codes.expires_at', '>', now()->utc())
            ->whereNotIn('appointments.status', self::CLOSED_STATUSES);
    }
}
