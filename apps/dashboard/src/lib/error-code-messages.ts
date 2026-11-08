import type { ErrorCode } from './error-codes';

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
    'patients.insurance_member_number_taken':
        'Ese número de afiliado ya está registrado para otro paciente de la misma obra social. Revisá que esté bien escrito.',
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
    'availability.exception_merge_required':
        'Esa excepción se combina con otra del mismo tipo. Confirmá la combinación para continuar.',
    'availability.exception_already_covered':
        'Ese período ya está incluido en otra excepción del mismo tipo. No hace falta agregarlo.',
    'availability.exception_type_conflict':
        'Ese período se cruza con una excepción de otro tipo. Ajustá las fechas o editá la excepción existente.',
    'holidays.provider_unavailable':
        'No pudimos obtener los feriados desde la fuente externa. Intentá nuevamente más tarde.',
    'medications.source_unavailable':
        'No se pudo consultar el Buscador Nacional de Medicamentos. Escribí el medicamento a mano.',
    'professionals.registry_unavailable':
        'No se pudo consultar el Buscador Nacional de Profesionales de la Salud. Probá de nuevo más tarde.',
    'professionals.document_locked':
        'Tu DNI ya está validado y no se puede cambiar desde acá. Para cambiarlo, comunicate con el soporte de Clini.',
    'subscriptions.inactive':
        'La suscripción del consultorio no está activa: la agenda está en modo solo lectura. Regularizá el pago desde Ajustes para volver a crear o modificar turnos, notas clínicas, medicación indicada y disponibilidad, y para recibir reservas online.',
    'subscriptions.already_active':
        'La suscripción del consultorio ya está activa. No hace falta volver a suscribirse.',
    'subscriptions.gateway_unavailable':
        'No pudimos comunicarnos con Mercado Pago. Intentá nuevamente en unos minutos.',
    'subscriptions.webhook_signature_invalid':
        'La notificación de pago no es válida.',
    // Operator-facing copy for the platform-moderation codes; the three that
    // describe a clinic user's own state reuse the panel's wording.
    'organizations.suspended':
        'La organización está suspendida. Comunicate con el soporte de Clini para regularizar la cuenta.',
    'organizations.already_suspended':
        'La organización ya estaba suspendida. Actualizá la página para ver su estado actual.',
    'organizations.not_suspended':
        'La organización ya estaba activa. Actualizá la página para ver su estado actual.',
    'booking.organization_unavailable':
        'Este consultorio no está recibiendo reservas online en este momento.',
    'booking.link_not_found':
        'Este link de reservas no existe. Revisá que esté bien escrito o pedile el link correcto al consultorio.',
    'booking.appointment_unavailable':
        'Este link ya no muestra el turno: puede haber pasado, o el consultorio lo canceló o lo reprogramó. Si tenés dudas, comunicate con el consultorio.',
    'auth.user_blocked':
        'Tu cuenta está bloqueada. Comunicate con el soporte de Clini.',
    'users.already_blocked':
        'El usuario ya estaba bloqueado. Actualizá la página para ver su estado actual.',
    'users.not_blocked':
        'El usuario ya estaba desbloqueado. Actualizá la página para ver su estado actual.',
    'users.email_already_verified':
        'El correo de este usuario ya estaba verificado.',
    'subscriptions.grace_extension_not_allowed':
        'Solo se puede extender la gracia de una suscripción en gracia o vencida.',
    'subscriptions.grace_extension_not_later':
        'Elegí una fecha posterior al fin de la gracia actual.',
    'subscriptions.not_cancellable':
        'La suscripción no tiene cobros activos para cancelar.',
    'plans.feature_unavailable':
        'El plan de la organización no incluye esta función.',
    'plans.professional_limit_exceeded':
        'La organización tiene más profesionales activos de los que su plan permite.',
    'plans.center_assigned': 'La organización está en el plan Centro.',
    'plans.assignment_unchanged':
        'La organización ya tiene ese plan asignado. Actualizá la página para ver su plan vigente.',
    'plans.subscription_live':
        'La organización tiene una suscripción de Mercado Pago que todavía puede cobrar. La persona dueña tiene que cancelarla antes de pasar a Centro.',
    'plans.appointment_limit_reached':
        'La organización llegó al límite de turnos del mes que incluye su plan.',
    'contact_requests.status_unchanged':
        'La consulta ya tiene ese estado. Actualizá la página para ver su estado actual.',
    'clinical_notes.annulled':
        'La nota clínica está anulada y ya no se puede enmendar ni anular.',
    'clinical_notes.amendment_unchanged':
        'La enmienda no cambia el texto ni los diagnósticos actuales de la nota clínica.',
    'clinical_notes.diagnosis_retired':
        'El código CIE-10 que se quiso agregar fue dado de baja en el catálogo.',
    'prescriptions.annulled':
        'La medicación está anulada: queda en la historia clínica tal como estaba y ya no se puede enmendar ni anular. Actualizá la página para ver su estado.',
    'prescriptions.amendment_unchanged':
        'La enmienda no cambia la medicación indicada.',
    'prescriptions.allergy_warning':
        'El paciente tiene una alergia vigente que coincide con esta medicación.',
    'vital_signs.annulled':
        'La medición está anulada y ya no se puede enmendar ni anular.',
    'vital_signs.amendment_unchanged':
        'La enmienda no cambia los valores de la medición.',
    'medical_history.withdrawn':
        'El antecedente ya no está vigente y no se puede enmendar ni dar de baja.',
    'medical_history.amendment_unchanged':
        'La enmienda no cambia el antecedente.',
    'medical_history.blood_type_unchanged':
        'Ese ya es el grupo sanguíneo registrado.',
    'clinical_access.reason_required':
        'Abrir esta historia clínica sin un turno cercano requiere indicar un motivo.',
    'clinical_access.reason_not_required':
        'La historia clínica ya está abierta sin indicar un motivo.',
    'clinical_access.code_invalid':
        'El código de acceso del paciente no es válido.',
    'clinical_access.code_unavailable':
        'El turno ya no tiene código de acceso.',
    'clinical_access.contact_unavailable':
        'Ese email no puede recibir el código de acceso.',
    'auth.two_factor_already_enabled':
        'La verificación en dos pasos ya está activada.',
    'auth.two_factor_not_enabled':
        'La verificación en dos pasos no está activada.',
    'auth.two_factor_setup_missing':
        'No hay una activación de la verificación en dos pasos pendiente.',
    'auth.two_factor_code_invalid': 'El código de verificación no es válido.',
    'auth.two_factor_challenge_expired': 'El inicio de sesión venció.',
    'account.deletion_last_active_admin':
        'El usuario es el único dueño o administrador activo de un consultorio.',
    'account.deletion_future_appointments':
        'El usuario tiene turnos por atender como profesional.',
    'auth.password_reset_invalid_or_expired':
        'El enlace para restablecer la contraseña no es válido o ya venció.',
};
