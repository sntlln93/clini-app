<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Public contract: each case is `<module>.<rule>`, snake_case. Renaming a
 * case is a breaking change for the panel's mirrored catalog
 * (`apps/panel/src/lib/error-codes.ts`) — the enum-parity test enforces
 * that both stay in sync.
 */
enum ErrorCode: string
{
    case AppointmentsServiceNotActiveForProfessional = 'appointments.service_not_active_for_professional';
    case AppointmentsSlotTaken = 'appointments.slot_taken';
    case AppointmentsNotCancellableFromStatus = 'appointments.not_cancellable_from_status';
    case AppointmentsNotReschedulableFromStatus = 'appointments.not_reschedulable_from_status';
    case AppointmentsStatusTransitionNotAllowed = 'appointments.status_transition_not_allowed';
    case MembershipsLastActiveAdmin = 'memberships.last_active_admin';
    case OrganizationsNoActiveMembership = 'organizations.no_active_membership';
    case PatientsNotFound = 'patients.not_found';
    case MembershipsInvitationInvalidOrExpired = 'memberships.invitation_invalid_or_expired';
    case AuthEmailVerificationInvalidOrExpired = 'auth.email_verification_invalid_or_expired';
}
