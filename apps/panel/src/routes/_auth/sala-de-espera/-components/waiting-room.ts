import { DateTime, formatTime, fromInstant, toInstant } from '@/lib/datetime';
import type { Appointment } from '@/types/appointment';
import type { Professional } from '@/types/professional';

export type WaitingQueue = {
    professional: Professional;
    /** Earliest arrival first; `[0]` is the next patient to be seen. */
    waiting: Appointment[];
};

/** The practice's "today" bounds, the only date this screen ever shows. */
export function todayRange(now: DateTime = DateTime.now()): {
    from: string;
    to: string;
} {
    return {
        from: toInstant(now.startOf('day')),
        to: toInstant(now.endOf('day')),
    };
}

/**
 * The screen may face patients, so only the first name plus the last word's
 * initial is shown ("María Gómez" → "María G.").
 */
export function displayPatientName(name: string | null | undefined): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return 'Paciente';
    }

    if (parts.length === 1) {
        return parts[0];
    }

    const lastInitial = parts[parts.length - 1]
        .charAt(0)
        .toLocaleUpperCase('es-AR');

    return `${parts[0]} ${lastInitial}.`;
}

// Falls back to the appointment start when the check-in time is missing.
function arrivalTime(appointment: Appointment): number {
    return fromInstant(
        appointment.arrived_at ?? appointment.start_at,
    ).toMillis();
}

function compareArrival(a: Appointment, b: Appointment): number {
    return (
        arrivalTime(a) - arrivalTime(b) ||
        fromInstant(a.start_at).toMillis() -
            fromInstant(b.start_at).toMillis() ||
        a.id - b.id
    );
}

/** One queue per visible professional, in roster order; appointments of anyone else are ignored. */
export function buildWaitingQueues(
    professionals: Professional[],
    appointments: Appointment[],
): WaitingQueue[] {
    const arrived = appointments.filter(
        (appointment) => appointment.status === 'arrived',
    );

    return professionals.map((professional) => ({
        professional,
        waiting: arrived
            .filter(
                (appointment) => appointment.membership_id === professional.id,
            )
            .sort(compareArrival),
    }));
}

export function formatAppointmentTime(iso: string): string {
    return formatTime(fromInstant(iso));
}

/** Whole minutes between check-in and `now`, or null when the check-in time is unknown. */
export function minutesSinceArrival(
    arrivedAt: string | null,
    now: number,
): number | null {
    if (arrivedAt === null) {
        return null;
    }

    return Math.max(
        0,
        Math.floor((now - fromInstant(arrivedAt).toMillis()) / 60_000),
    );
}

export function formatWaitingTime(minutes: number): string {
    if (minutes < 1) {
        return 'Llegó recién';
    }

    if (minutes < 60) {
        return `Llegó hace ${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return rest === 0
        ? `Llegó hace ${hours} h`
        : `Llegó hace ${hours} h ${rest} min`;
}

export function formatClockTime(timestamp: number): string {
    return formatTime(DateTime.fromMillis(timestamp));
}
