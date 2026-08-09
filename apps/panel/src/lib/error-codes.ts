import type { AppError } from './api-errors';

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
    | 'memberships.invitation_invalid_or_expired'
    | 'auth.email_verification_invalid_or_expired'
    | 'booking.slot_not_available'
    | 'memberships.slug_invalid_format'
    | 'memberships.slug_taken'
    | 'memberships.slug_not_allowed_for_role';

/** User-facing Spanish copy for each business-rule code — the only source of UI copy for a `BusinessError`, since the backend's own `message` is never rendered. */
export const ERROR_CODE_MESSAGES: Record<ErrorCode, string> = {
    'appointments.service_not_active_for_professional':
        'El profesional no tiene este servicio activo. Elegí otro servicio o comunicate con el consultorio.',
    'appointments.slot_taken':
        'El profesional ya tiene un turno en ese horario.',
    'appointments.not_cancellable_from_status':
        'Este turno no se puede cancelar porque su estado actual no lo permite. Actualizá la página para ver el estado vigente y las acciones disponibles.',
    'appointments.not_reschedulable_from_status':
        'Este turno no se puede reprogramar porque su estado actual no lo permite. Actualizá la página para ver el estado vigente y las acciones disponibles.',
    'appointments.status_transition_not_allowed':
        'El turno no puede pasar a ese estado. Actualizá la página para ver las acciones disponibles según su estado actual.',
    'memberships.last_active_admin':
        'La organización debe mantener al menos un miembro activo con rol de propietario o administrador.',
    'organizations.no_active_membership':
        'Tu cuenta no tiene una organización activa. Pedí acceso a un administrador.',
    'patients.not_found':
        'No encontramos un paciente con ese documento. Revisá que esté bien escrito o creá un paciente nuevo si todavía no está registrado.',
    'memberships.invitation_invalid_or_expired':
        'La invitación no es válida o ya expiró. Pedile a quien te invitó que te envíe una nueva.',
    'auth.email_verification_invalid_or_expired':
        'El enlace de verificación no es válido o ya venció. Podés seguir usando tu cuenta con normalidad; iniciá sesión de nuevo si es necesario.',
    'booking.slot_not_available':
        'Ese horario ya no está disponible. Elegí otro turno.',
    'memberships.slug_invalid_format':
        'El link debe tener entre 3 y 50 caracteres, usando solo minúsculas, números y guiones, sin empezar, terminar ni repetir guiones.',
    'memberships.slug_taken': 'Ese link ya está en uso. Probá con otro.',
    'memberships.slug_not_allowed_for_role':
        'Solo los profesionales pueden tener un link público.',
};

/** Generic copy for every non-`'business'` `AppError` kind; `validation` here is only the fallback when the 422 carries no top-level message. */
const GENERIC_MESSAGES: Record<
    Exclude<AppError['kind'], 'business'>,
    string
> = {
    validation: 'Los datos ingresados no son válidos.',
    unauthorized: 'Tu sesión no es válida. Iniciá sesión nuevamente.',
    forbidden:
        'No tenés permiso para ver esta sección. Pedí acceso a un administrador.',
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
