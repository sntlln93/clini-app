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
    case PatientsInsuranceMemberNumberTaken = 'patients.insurance_member_number_taken';
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
    case SubscriptionsNotCancellable = 'subscriptions.not_cancellable';
    case PlansFeatureUnavailable = 'plans.feature_unavailable';
    case PlansProfessionalLimitExceeded = 'plans.professional_limit_exceeded';
    case PlansCenterAssigned = 'plans.center_assigned';
    case PlansAssignmentUnchanged = 'plans.assignment_unchanged';
    case PlansSubscriptionLive = 'plans.subscription_live';
    case PlansAppointmentLimitReached = 'plans.appointment_limit_reached';
    case BookingLinkNotFound = 'booking.link_not_found';
    case BookingAppointmentUnavailable = 'booking.appointment_unavailable';
    case ContactRequestsStatusUnchanged = 'contact_requests.status_unchanged';
    case ClinicalNotesAnnulled = 'clinical_notes.annulled';
    case ClinicalNotesAmendmentUnchanged = 'clinical_notes.amendment_unchanged';
    case ClinicalNotesDiagnosisRetired = 'clinical_notes.diagnosis_retired';
    case PrescriptionsAnnulled = 'prescriptions.annulled';
    case PrescriptionsAmendmentUnchanged = 'prescriptions.amendment_unchanged';
    case VitalSignsAnnulled = 'vital_signs.annulled';
    case VitalSignsAmendmentUnchanged = 'vital_signs.amendment_unchanged';
    case MedicalHistoryWithdrawn = 'medical_history.withdrawn';
    case MedicalHistoryAmendmentUnchanged = 'medical_history.amendment_unchanged';
    case MedicalHistoryBloodTypeUnchanged = 'medical_history.blood_type_unchanged';
    case ClinicalAccessReasonRequired = 'clinical_access.reason_required';
    case ClinicalAccessReasonNotRequired = 'clinical_access.reason_not_required';
    case ClinicalAccessCodeInvalid = 'clinical_access.code_invalid';
    case ClinicalAccessCodeUnavailable = 'clinical_access.code_unavailable';
    case ClinicalAccessContactUnavailable = 'clinical_access.contact_unavailable';
    case AuthTwoFactorAlreadyEnabled = 'auth.two_factor_already_enabled';
    case AuthTwoFactorNotEnabled = 'auth.two_factor_not_enabled';
    case AuthTwoFactorSetupMissing = 'auth.two_factor_setup_missing';
    case AuthTwoFactorCodeInvalid = 'auth.two_factor_code_invalid';
    case AuthTwoFactorChallengeExpired = 'auth.two_factor_challenge_expired';
}
