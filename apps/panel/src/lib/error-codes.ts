import type { AppError } from './api-errors';

/**
 * Public contract mirrored from `apps/api/app/Enums/ErrorCode.php`. Kept in
 * sync by the parity test in `src/lib/-tests/error-code-parity.test.ts` —
 * renaming a code requires updating both sides in the same change.
 */
export type ErrorCode =
    | 'appointments.service_not_active_for_professional'
    | 'appointments.slot_taken'
    | 'appointments.not_cancellable_from_status'
    | 'appointments.not_reschedulable_from_status'
    | 'appointments.status_transition_not_allowed'
    | 'memberships.last_active_admin'
    | 'organizations.no_active_membership'
    | 'patients.not_found'
    | 'memberships.invitation_invalid_or_expired'
    | 'auth.email_verification_invalid_or_expired';

/**
 * User-facing Spanish copy for each business-rule code. The backend's own
 * `message` is English and developer-facing (log/stack only) — never
 * rendered — so this catalog is the only source of UI copy for a
 * `BusinessError`. Includes the 7 messages that used to be hardcoded in the
 * backend Actions before issue #87.
 */
export const ERROR_CODE_MESSAGES: Record<ErrorCode, string> = {
    'appointments.service_not_active_for_professional':
        'El profesional no tiene este servicio activo.',
    'appointments.slot_taken':
        'El profesional ya tiene un turno en ese horario.',
    'appointments.not_cancellable_from_status':
        'Este turno no puede cancelarse desde su estado actual.',
    'appointments.not_reschedulable_from_status':
        'Este turno no puede reprogramarse desde su estado actual.',
    'appointments.status_transition_not_allowed':
        'Esa transición de estado no está permitida.',
    'memberships.last_active_admin':
        'La organización debe mantener al menos un miembro activo con rol de propietario o administrador.',
    'organizations.no_active_membership':
        'Tu cuenta no tiene una organización activa. Pedí acceso a un administrador.',
    'patients.not_found': 'No encontramos un paciente con ese documento.',
    'memberships.invitation_invalid_or_expired':
        'La invitación no es válida o ya expiró. Pedile a quien te invitó que te envíe una nueva.',
    'auth.email_verification_invalid_or_expired':
        'El enlace de verificación no es válido o ya venció.',
};

/**
 * Generic Spanish copy for every `AppError` kind that isn't `'business'`
 * (which resolves through `ERROR_CODE_MESSAGES` above). `validation`'s own
 * per-field messages come straight from the backend's native 422 shape —
 * this entry is only the fallback for the rare case that shape carries no
 * top-level message at all.
 */
const GENERIC_MESSAGES: Record<
    Exclude<AppError['kind'], 'business'>,
    string
> = {
    validation: 'Los datos ingresados no son válidos.',
    unauthorized: 'Tu sesión no es válida. Iniciá sesión nuevamente.',
    session_expired: 'Tu sesión expiró. Recargá la página e intentá de nuevo.',
    rate_limited:
        'Hiciste demasiados intentos. Esperá un momento y volvé a intentar.',
    network: 'No pudimos conectarnos. Revisá tu conexión e intentá nuevamente.',
    unexpected: 'Ocurrió un error inesperado. Intentá nuevamente.',
};

/**
 * The single place that turns any `AppError` into Spanish UI copy: by
 * `ErrorCode` for a `BusinessError`, and a generic message per kind
 * otherwise. Never surfaces the backend's own `message`.
 */
export function messageForAppError(error: AppError): string {
    if (error.kind === 'business') {
        return ERROR_CODE_MESSAGES[error.code];
    }

    if (error.kind === 'validation') {
        return error.serverMessage ?? GENERIC_MESSAGES.validation;
    }

    return GENERIC_MESSAGES[error.kind];
}
