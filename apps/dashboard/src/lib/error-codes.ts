import type { AppError } from './api-errors';
import { ERROR_CODE_MESSAGES } from './error-code-messages';

export { ERROR_CODE_MESSAGES };

/** Public contract mirrored from `apps/api/app/Enums/ErrorCode.php`; kept in sync by `src/lib/error-code-parity.test.ts`. */
export type ErrorCode =
    | 'appointments.service_not_active_for_professional'
    | 'appointments.slot_taken'
    | 'appointments.not_cancellable_from_status'
    | 'appointments.not_reschedulable_from_status'
    | 'appointments.status_transition_not_allowed'
    | 'memberships.last_active_admin'
    | 'organizations.no_active_membership'
    | 'patients.not_found'
    | 'patients.insurance_member_number_taken'
    | 'memberships.invitation_invalid_or_expired'
    | 'auth.email_verification_invalid_or_expired'
    | 'booking.slot_not_available'
    | 'memberships.slug_invalid_format'
    | 'memberships.slug_taken'
    | 'memberships.slug_not_allowed_for_role'
    | 'availability.exception_merge_required'
    | 'availability.exception_already_covered'
    | 'availability.exception_type_conflict'
    | 'holidays.provider_unavailable'
    | 'medications.source_unavailable'
    | 'professionals.registry_unavailable'
    | 'professionals.document_locked'
    | 'subscriptions.inactive'
    | 'subscriptions.already_active'
    | 'subscriptions.gateway_unavailable'
    | 'subscriptions.webhook_signature_invalid'
    | 'organizations.suspended'
    | 'organizations.already_suspended'
    | 'organizations.not_suspended'
    | 'booking.organization_unavailable'
    | 'auth.user_blocked'
    | 'users.already_blocked'
    | 'users.not_blocked'
    | 'users.email_already_verified'
    | 'subscriptions.grace_extension_not_allowed'
    | 'subscriptions.grace_extension_not_later'
    | 'subscriptions.not_cancellable'
    | 'plans.feature_unavailable'
    | 'plans.professional_limit_exceeded'
    | 'plans.center_assigned'
    | 'plans.assignment_unchanged'
    | 'plans.subscription_live'
    | 'plans.appointment_limit_reached'
    | 'booking.link_not_found'
    | 'booking.appointment_unavailable'
    | 'contact_requests.status_unchanged'
    | 'clinical_notes.annulled'
    | 'clinical_notes.amendment_unchanged'
    | 'clinical_notes.diagnosis_retired'
    | 'prescriptions.annulled'
    | 'prescriptions.amendment_unchanged'
    | 'prescriptions.allergy_warning'
    | 'vital_signs.annulled'
    | 'vital_signs.amendment_unchanged'
    | 'medical_history.withdrawn'
    | 'medical_history.amendment_unchanged'
    | 'medical_history.blood_type_unchanged'
    | 'clinical_access.reason_required'
    | 'clinical_access.reason_not_required'
    | 'clinical_access.code_invalid'
    | 'clinical_access.code_unavailable'
    | 'clinical_access.contact_unavailable'
    | 'auth.two_factor_already_enabled'
    | 'auth.two_factor_not_enabled'
    | 'auth.two_factor_setup_missing'
    | 'auth.two_factor_code_invalid'
    | 'auth.two_factor_challenge_expired'
    | 'account.deletion_last_active_admin'
    | 'account.deletion_future_appointments'
    | 'auth.password_reset_invalid_or_expired';

/** Generic copy for every non-`'business'` `AppError` kind; `validation` here is only the fallback when the 422 carries no top-level message. */
const GENERIC_MESSAGES: Record<
    Exclude<AppError['kind'], 'business'>,
    string
> = {
    validation: 'Los datos ingresados no son válidos.',
    unauthorized: 'Tu sesión no es válida. Iniciá sesión nuevamente.',
    forbidden:
        'No tenés permiso para acceder a esta sección del panel de operación.',
    session_expired: 'Tu sesión expiró. Recargá la página e intentá de nuevo.',
    rate_limited:
        'Hiciste demasiados intentos. Esperá un momento y volvé a intentar.',
    network: 'No pudimos conectarnos. Revisá tu conexión e intentá nuevamente.',
    unexpected: 'Ocurrió un error inesperado. Intentá nuevamente.',
};

/** Turns any `AppError` into Spanish UI copy — by `ErrorCode` for a `BusinessError`, generic otherwise. */
export function messageForAppError(error: AppError): string {
    if (error.kind === 'business') {
        return ERROR_CODE_MESSAGES[error.code];
    }

    if (error.kind === 'validation') {
        return error.serverMessage ?? GENERIC_MESSAGES.validation;
    }

    return GENERIC_MESSAGES[error.kind];
}
