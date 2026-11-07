import { useWritesRestriction, type WritesRestriction } from '@/lib/plan';
import { useSession } from '@/lib/session';

const READ_ONLY_REASONS: Record<WritesRestriction, string> = {
    subscription: 'Tu suscripción no está activa: es de solo lectura.',
    plan: 'El plan Gratis incluye un solo profesional activo: es de solo lectura hasta que pases a Consultorio o desactives profesionales.',
};

// Who writes the measurements and the background on the patient page (#361),
// as the medication: a new record goes on today's own appointment, or outside
// an appointment without one (#382, ADR 0037), only its author amends or
// withdraws one, and nothing is written while the subscription or the plan
// leaves the practice read-only. Unlike the medication, every plan includes
// them. The cards only render while the history is open, which is what the
// API asks of a record outside an appointment.
export function useClinicalWriteAccess(todaysAppointmentId: number | null) {
    const restriction = useWritesRestriction();
    const { data: session } = useSession();
    const ownMembershipId = session?.membership?.id ?? null;
    const canWrite = restriction === null;

    return {
        canWrite,
        // The appointment a new record goes on, or null outside one.
        recordingAppointmentId: todaysAppointmentId,
        unavailableReason:
            restriction !== null ? READ_ONLY_REASONS[restriction] : null,
        isOwn: (record: { membership_id: number }) =>
            canWrite && record.membership_id === ownMembershipId,
    };
}
