<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Each case is `<module>.<rule>`; renaming one breaks the panel's and the dashboard's mirrored catalogs (`apps/panel/src/lib/error-codes.ts`, `apps/dashboard/src/lib/error-codes.ts`) — an enum-parity test in each enforces they stay in sync.
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
    case BookingSlotNotAvailable = 'booking.slot_not_available';
    case MembershipsSlugInvalidFormat = 'memberships.slug_invalid_format';
    case MembershipsSlugTaken = 'memberships.slug_taken';
    case MembershipsSlugNotAllowedForRole = 'memberships.slug_not_allowed_for_role';
    case AvailabilitySlotMergeRequired = 'availability.slot_merge_required';
    case AvailabilitySlotAlreadyCovered = 'availability.slot_already_covered';
    case AvailabilityExceptionMergeRequired = 'availability.exception_merge_required';
    case AvailabilityExceptionAlreadyCovered = 'availability.exception_already_covered';
    case AvailabilityExceptionTypeConflict = 'availability.exception_type_conflict';
    case HolidaysProviderUnavailable = 'holidays.provider_unavailable';
    case SubscriptionsInactive = 'subscriptions.inactive';
    case SubscriptionsAlreadyActive = 'subscriptions.already_active';
    case SubscriptionsGatewayUnavailable = 'subscriptions.gateway_unavailable';
    case SubscriptionsWebhookSignatureInvalid = 'subscriptions.webhook_signature_invalid';
    case OrganizationsSuspended = 'organizations.suspended';
    case OrganizationsAlreadySuspended = 'organizations.already_suspended';
    case OrganizationsNotSuspended = 'organizations.not_suspended';
    case BookingOrganizationUnavailable = 'booking.organization_unavailable';
    case AuthUserBlocked = 'auth.user_blocked';
    case UsersAlreadyBlocked = 'users.already_blocked';
    case UsersNotBlocked = 'users.not_blocked';
    case UsersEmailAlreadyVerified = 'users.email_already_verified';
    case SubscriptionsGraceExtensionNotAllowed = 'subscriptions.grace_extension_not_allowed';
    case SubscriptionsGraceExtensionNotLater = 'subscriptions.grace_extension_not_later';
}
