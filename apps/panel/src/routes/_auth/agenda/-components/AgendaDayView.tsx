import type { Appointment } from '@/types/appointment';
import type { Membership } from '@/types/membership';
import { AppointmentCard } from './AppointmentCard';

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_HEIGHT_PX = 64;
const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;
const MIN_CARD_HEIGHT_PX = 20;

function isSameDay(iso: string, date: Date): boolean {
    const time = new Date(iso);
    return (
        time.getFullYear() === date.getFullYear() &&
        time.getMonth() === date.getMonth() &&
        time.getDate() === date.getDate()
    );
}

function offsetPx(iso: string): number {
    const time = new Date(iso);
    return (
        ((time.getHours() - START_HOUR) * 60 + time.getMinutes()) *
        PX_PER_MINUTE
    );
}

function formatHour(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
}

export type AgendaDayViewProps = {
    date: Date;
    professionals: Membership[];
    appointments: Appointment[];
    canUpdate: (membership: Membership) => boolean;
    onCellClick?: (membershipId: number, hour: number) => void;
};

export function AgendaDayView({
    date,
    professionals,
    appointments,
    canUpdate,
    onCellClick,
}: AgendaDayViewProps) {
    const hours = Array.from(
        { length: END_HOUR - START_HOUR },
        (_, index) => START_HOUR + index,
    );
    const columnHeight = hours.length * HOUR_HEIGHT_PX;

    return (
        <div className="overflow-auto rounded-lg border">
            <div className="flex min-w-max">
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

                {professionals.map((professional) => {
                    const dayAppointments = appointments.filter(
                        (appointment) =>
                            appointment.membership_id === professional.id &&
                            isSameDay(appointment.start_at, date),
                    );

                    return (
                        <div
                            key={professional.id}
                            className="w-48 shrink-0 border-r last:border-r-0"
                        >
                            <div className="flex h-10 items-center border-b px-2 text-sm font-medium">
                                {professional.user.name ?? 'Sin nombre'}
                            </div>

                            <div
                                className="relative"
                                style={{ height: columnHeight }}
                            >
                                {hours.map((hour) => (
                                    <button
                                        key={hour}
                                        type="button"
                                        className="absolute left-0 w-full border-t hover:bg-muted/50"
                                        style={{
                                            top:
                                                (hour - START_HOUR) *
                                                HOUR_HEIGHT_PX,
                                            height: HOUR_HEIGHT_PX,
                                        }}
                                        onClick={() =>
                                            onCellClick?.(professional.id, hour)
                                        }
                                    />
                                ))}

                                {dayAppointments.map((appointment) => {
                                    const top = offsetPx(appointment.start_at);
                                    const height = Math.max(
                                        offsetPx(appointment.end_at) - top,
                                        MIN_CARD_HEIGHT_PX,
                                    );

                                    return (
                                        <div
                                            key={appointment.id}
                                            className="absolute right-0.5 left-0.5"
                                            style={{ top, height }}
                                        >
                                            <AppointmentCard
                                                appointment={appointment}
                                                canUpdate={canUpdate(
                                                    professional,
                                                )}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
