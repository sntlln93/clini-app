import { appointmentAnchorId } from '@/lib/agenda-anchor';
import { INACTIVE_STATUSES } from '@/lib/appointment-status';
import { fromInstant, toCalendarDate } from '@/lib/datetime';
import type { PatientAppointmentHistoryItem } from '@/types/patient';

/** Search params that open the agenda's day view on the practice's day of `iso`. */
export function agendaDaySearch(iso: string) {
    return { date: toCalendarDate(fromInstant(iso)), view: 'day' as const };
}

/**
 * `Link` props that open the appointment's day scrolled to its block (#343):
 * the router scrolls to the element whose id is the hash once the day renders.
 * A cancelled or rescheduled one is hidden by default, so the link shows them.
 */
export function agendaAppointmentLink(
    appointment: Pick<
        PatientAppointmentHistoryItem,
        'id' | 'start_at' | 'status'
    >,
) {
    return {
        search: {
            ...agendaDaySearch(appointment.start_at),
            showCancelled: INACTIVE_STATUSES.includes(appointment.status)
                ? true
                : undefined,
        },
        hash: appointmentAnchorId(appointment.id),
        hashScrollIntoView: { block: 'center', inline: 'nearest' } as const,
    };
}
