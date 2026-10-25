import { DateTime } from '@/lib/datetime';
import type { WritesRestriction } from '@/lib/plan';
import type { Appointment } from '@/types/appointment';
import { rangeFor } from './agenda-dates';
import type { AgendaViewMode } from './AgendaToolbar';

/** Whether the range is already over, holds today, or is still to come. */
export type AgendaRangeTense = 'past' | 'current' | 'future';

const DAY_FORMAT = { weekday: 'long', day: 'numeric', month: 'long' } as const;
const WEEK_FORMAT = { day: 'numeric', month: 'long' } as const;

/** Whether any of the loaded range's appointments belongs to a visible professional. */
export function hasVisibleAppointments(
    appointments: Appointment[],
    visibleProfessionals: { id: number }[],
): boolean {
    const visibleIds = new Set(
        visibleProfessionals.map((professional) => professional.id),
    );

    return appointments.some((appointment) =>
        visibleIds.has(appointment.membership_id),
    );
}

export function agendaRangeTense(
    date: DateTime,
    view: AgendaViewMode,
    now: DateTime = DateTime.now(),
): AgendaRangeTense {
    const { start, end } = rangeFor(date, view);

    if (end < now) {
        return 'past';
    }

    return start > now ? 'future' : 'current';
}

/** The day a manual appointment from an empty range starts on: the day shown, or the week's first day that isn't over. */
export function newAppointmentDay(
    date: DateTime,
    view: AgendaViewMode,
    now: DateTime = DateTime.now(),
): DateTime {
    if (view === 'day') {
        return date;
    }

    const { start } = rangeFor(date, view);

    return start < now ? now : start;
}

/** The title of an agenda with no appointments, in the words of the range it shows. */
export function agendaEmptyTitle(
    date: DateTime,
    view: AgendaViewMode,
    tense: AgendaRangeTense,
): string {
    if (view === 'day') {
        if (tense === 'current') {
            return 'Hoy no tenés turnos';
        }

        return tense === 'past'
            ? 'No hubo turnos ese día'
            : `No tenés turnos el ${date.toLocaleString(DAY_FORMAT)}`;
    }

    if (tense === 'current') {
        return 'Esta semana no tenés turnos';
    }

    return tense === 'past'
        ? 'No hubo turnos esa semana'
        : `No tenés turnos la semana del ${rangeFor(date, view).start.toLocaleString(WEEK_FORMAT)}`;
}

// While writes are restricted the public booking page takes no bookings either (`subscription.active`).
const RESTRICTED_DESCRIPTIONS: Record<WritesRestriction, string> = {
    subscription:
        'Tu suscripción no está activa: la agenda es de solo lectura y el link de reservas no toma turnos.',
    plan: 'El plan Gratis incluye un solo profesional activo: la agenda es de solo lectura y el link de reservas no toma turnos hasta que pases a Consultorio o desactives profesionales.',
};

/** What an empty agenda suggests: the steps that fill a day still to come, or a way back from one already over. */
export function agendaEmptyDescription(
    tense: AgendaRangeTense,
    canCreate: boolean,
    restriction: WritesRestriction | null = null,
): string {
    if (tense === 'past') {
        return 'Volvé a hoy para ver tus próximos turnos.';
    }

    if (restriction) {
        return RESTRICTED_DESCRIPTIONS[restriction];
    }

    return canCreate
        ? 'Compartí tu link de reservas para sumar turnos. También podés agendar un turno manualmente.'
        : 'Compartí tu link de reservas para sumar turnos.';
}
