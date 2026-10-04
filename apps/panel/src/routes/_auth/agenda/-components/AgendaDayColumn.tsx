import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';
import type { Professional } from '@/types/professional';
import { startOfDay } from './agenda-dates';
import { INACTIVE_STATUSES } from './appointment-status';
import { AppointmentCard } from './AppointmentCard';

export const HOUR_HEIGHT_PX = 96;
const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;
// Floor so even a very short appointment fits the compact (hour + patient + badge) layout.
const MIN_CARD_HEIGHT_PX = 48;
// Below this, a card switches to compact: three lines don't fit a block this short.
const COMPACT_CARD_HEIGHT_PX = 64;

export function formatHour(hour: number): string {
    return `${String(hour).padStart(2, '0')}:00`;
}

type AgendaDayColumnProps = {
    date: Date;
    hours: number[];
    professional: Professional;
    appointments: Appointment[];
    canUpdate: boolean;
    canCreate: boolean;
    onCellClick?: (membershipId: number, hour: number) => void;
};

export function AgendaDayColumn({
    date,
    hours,
    professional,
    appointments,
    canUpdate,
    canCreate,
    onCellClick,
}: AgendaDayColumnProps) {
    const startHour = hours[0];
    const columnHeight = hours.length * HOUR_HEIGHT_PX;
    const dayStart = startOfDay(date).getTime();
    // Measured from the day's midnight rather than `getHours()`, so an end past midnight still lands below the last row.
    const offsetPx = (iso: string) =>
        ((new Date(iso).getTime() - dayStart) / 60_000 - startHour * 60) *
        PX_PER_MINUTE;
    // Inactive appointments paint first, so an active one rebooked into the freed slot stays on top.
    const ordered = [...appointments].sort(
        (a, b) =>
            Number(INACTIVE_STATUSES.includes(b.status)) -
            Number(INACTIVE_STATUSES.includes(a.status)),
    );

    return (
        <div className="min-w-0 flex-1 basis-0 border-r last:border-r-0">
            <div className="flex h-10 items-center border-b px-2 text-sm font-medium">
                {professional.user.name}
            </div>

            <div className="relative" style={{ height: columnHeight }}>
                {hours.map((hour) => {
                    const style = {
                        top: (hour - startHour) * HOUR_HEIGHT_PX,
                        height: HOUR_HEIGHT_PX,
                    };

                    return canCreate ? (
                        <button
                            key={hour}
                            type="button"
                            aria-label={`Crear turno a las ${formatHour(hour)} para ${professional.user.name}`}
                            className="absolute left-0 w-full cursor-pointer border-t hover:bg-muted/50"
                            style={style}
                            onClick={() => onCellClick?.(professional.id, hour)}
                        />
                    ) : (
                        <div
                            key={hour}
                            className="absolute left-0 w-full border-t"
                            style={style}
                        />
                    );
                })}

                {ordered.map((appointment) => {
                    const top = offsetPx(appointment.start_at);
                    const height = Math.max(
                        Math.min(offsetPx(appointment.end_at), columnHeight) -
                            top,
                        MIN_CARD_HEIGHT_PX,
                    );
                    const isInactive = INACTIVE_STATUSES.includes(
                        appointment.status,
                    );

                    return (
                        <div
                            key={appointment.id}
                            // Click-through for inactive appointments: the card re-enables pointer events only when it has a menu, so a static one never hides the free cell underneath.
                            className={cn(
                                'absolute right-0.5 left-0.5',
                                isInactive && 'pointer-events-none opacity-60',
                            )}
                            style={{ top, height }}
                        >
                            <AppointmentCard
                                appointment={appointment}
                                canUpdate={canUpdate}
                                variant="day"
                                compact={height < COMPACT_CARD_HEIGHT_PX}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
