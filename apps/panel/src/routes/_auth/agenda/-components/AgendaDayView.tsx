import type { Appointment } from '@/types/appointment';
import type { Professional } from '@/types/professional';
import { AgendaDayColumn, formatHour, HOUR_HEIGHT_PX } from './AgendaDayColumn';
import { dayHourRange } from './day-hour-range';

function isSameDay(iso: string, date: Date): boolean {
    const time = new Date(iso);
    return (
        time.getFullYear() === date.getFullYear() &&
        time.getMonth() === date.getMonth() &&
        time.getDate() === date.getDate()
    );
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

    return (
        <div className="overflow-auto rounded-lg border">
            <div className="flex w-full">
                <div className="w-14 shrink-0 border-r">
                    <div className="h-10 border-b" />
                    {hours.map((hour) => (
                        <div
                            key={hour}
                            className="border-t px-1 text-right text-xs text-muted-foreground"
                            style={{ height: HOUR_HEIGHT_PX }}
                        >
                            {formatHour(hour)}
                        </div>
                    ))}
                </div>

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
                        onCellClick={onCellClick}
                    />
                ))}
            </div>
        </div>
    );
}
