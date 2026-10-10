import type { Appointment } from '@/types/appointment';
import type { Professional } from '@/types/professional';
import { AgendaColumnHeader } from './AgendaColumnHeader';
import { AgendaDayColumn, HOUR_HEIGHT_PX } from './AgendaDayColumn';
import { AgendaTimeGutter } from './AgendaTimeGutter';
import { dayHourRange } from './day-hour-range';

function isSameDay(iso: string, date: Date): boolean {
    const time = new Date(iso);
    return (
        time.getFullYear() === date.getFullYear() &&
        time.getMonth() === date.getMonth() &&
        time.getDate() === date.getDate()
    );
}

/** The current-time line's offset when `date` is today and the time falls inside the grid. */
function nowOffset(
    date: Date,
    startHour: number,
    hourCount: number,
): number | null {
    const now = new Date();
    if (!isSameDay(now.toISOString(), date)) {
        return null;
    }
    const minutes = now.getHours() * 60 + now.getMinutes() - startHour * 60;
    const offset = (minutes / 60) * HOUR_HEIGHT_PX;
    return offset >= 0 && offset <= hourCount * HOUR_HEIGHT_PX ? offset : null;
}

export type AgendaDayViewProps = {
    date: Date;
    professionals: Professional[];
    appointments: Appointment[];
    canUpdate: (membership: Professional) => boolean;
    canCreate: (membership: Professional) => boolean;
    onCellClick?: (membershipId: number, hour: number) => void;
};

export function AgendaDayView({
    date,
    professionals,
    appointments,
    canUpdate,
    canCreate,
    onCellClick,
}: AgendaDayViewProps) {
    const visibleIds = new Set(
        professionals.map((professional) => professional.id),
    );
    const dayAppointments = appointments.filter(
        (appointment) =>
            visibleIds.has(appointment.membership_id) &&
            isSameDay(appointment.start_at, date),
    );
    // One shared range for every column, so hour rows stay aligned across professionals.
    const { startHour, endHour } = dayHourRange(dayAppointments, date);
    const hours = Array.from(
        { length: endHour - startHour },
        (_, index) => startHour + index,
    );

    const nowOffsetPx = nowOffset(date, hours[0], hours.length);

    return (
        <div className="overflow-x-auto px-2.5">
            <div
                className="grid min-w-lg"
                style={{
                    gridTemplateColumns: `3.4rem repeat(${professionals.length}, minmax(9.5rem, 1fr))`,
                }}
            >
                <div />
                {professionals.map((professional) => (
                    <AgendaColumnHeader
                        key={professional.id}
                        professional={professional}
                    />
                ))}

                <AgendaTimeGutter hours={hours} />
                {professionals.map((professional) => (
                    <AgendaDayColumn
                        key={professional.id}
                        date={date}
                        hours={hours}
                        professional={professional}
                        appointments={dayAppointments.filter(
                            (appointment) =>
                                appointment.membership_id === professional.id,
                        )}
                        canUpdate={canUpdate(professional)}
                        canCreate={canCreate(professional)}
                        nowOffsetPx={nowOffsetPx}
                        onCellClick={onCellClick}
                    />
                ))}
            </div>
        </div>
    );
}
