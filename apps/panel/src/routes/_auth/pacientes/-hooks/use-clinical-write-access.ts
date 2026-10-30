import { useWritesRestriction, type WritesRestriction } from '@/lib/plan';
import { useSession } from '@/lib/session';

const READ_ONLY_REASONS: Record<WritesRestriction, string> = {
    subscription: 'Tu suscripción no está activa: es de solo lectura.',
    plan: 'El plan Gratis incluye un solo profesional activo: es de solo lectura hasta que pases a Consultorio o desactives profesionales.',
};

// Who writes the measurements and the background on the patient page (#361),
// as the medication: a new record goes on today's own appointment, only its
// author amends or withdraws one, and nothing is written while the
// subscription or the plan leaves the practice read-only. Unlike the
// medication, every plan includes them.
export function useClinicalWriteAccess(todaysAppointmentId: number | null) {
    const restriction = useWritesRestriction();
    const { data: session } = useSession();
    const ownMembershipId = session?.membership?.id ?? null;
    const canWrite = restriction === null;

    return {
        canWrite,
        // The appointment a new record goes on, or null when none can.
        recordingAppointmentId: canWrite ? todaysAppointmentId : null,
        unavailableReason:
            restriction !== null
                ? READ_ONLY_REASONS[restriction]
                : todaysAppointmentId === null
                  ? 'Podés registrar cuando tengas un turno con este paciente hoy.'
                  : null,
        isOwn: (record: { membership_id: number }) =>
            canWrite && record.membership_id === ownMembershipId,
    };
}
