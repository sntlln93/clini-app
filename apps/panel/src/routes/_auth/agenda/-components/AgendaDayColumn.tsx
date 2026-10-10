import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointment';
import type { Professional } from '@/types/professional';
import { startOfDay } from './agenda-dates';
import { INACTIVE_STATUSES } from './appointment-status';
import { AppointmentCard } from './AppointmentCard';

// 72px per half hour, like the landing's agenda example.
export const HOUR_HEIGHT_PX = 144;
const PX_PER_MINUTE = HOUR_HEIGHT_PX / 60;
// Gap between a block and its slot edges (the landing's `inset-x-1` plus 4px top and bottom).
const BLOCK_INSET_PX = 4;
// Floor so even a very short appointment fits the compact layout and stays a 44px touch target.
const MIN_CARD_HEIGHT_PX = 52;
// Below this, a card switches to compact: patient, service and status don't fit a block this short.
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
    /** Where the current-time line sits, in px from the top; null when the day isn't today. */
    nowOffsetPx: number | null;
    onCellClick?: (membershipId: number, hour: number) => void;
};

export function AgendaDayColumn({
    date,
    hours,
    professional,
    appointments,
    canUpdate,
    canCreate,
    nowOffsetPx,
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
        <div
            data-professional-column={professional.id}
            // A 1px line every half hour, drawn as a background like the landing's grid.
            className="relative min-w-0 bg-[repeating-linear-gradient(to_bottom,transparent_0_71px,var(--border)_71px_72px)]"
            style={{ height: columnHeight }}
        >
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
                        className="absolute left-0 w-full cursor-pointer rounded-xl hover:bg-muted/60"
                        style={style}
                        onClick={() => onCellClick?.(professional.id, hour)}
                    />
                ) : (
                    <div
                        key={hour}
                        className="absolute left-0 w-full"
                        style={style}
                    />
                );
            })}

            {nowOffsetPx !== null && (
                <div
                    aria-hidden="true"
                    data-now-line
                    className="pointer-events-none absolute inset-x-0 z-2 border-t-2 border-destructive before:absolute before:-top-1.25 before:-left-1 before:size-2 before:rounded-full before:bg-destructive"
                    style={{ top: nowOffsetPx }}
                />
            )}

            {ordered.map((appointment) => {
                const slotTop = offsetPx(appointment.start_at);
                const slotHeight = Math.max(
                    Math.min(offsetPx(appointment.end_at), columnHeight) -
                        slotTop,
                    MIN_CARD_HEIGHT_PX + 2 * BLOCK_INSET_PX,
                );
                const height = slotHeight - 2 * BLOCK_INSET_PX;
                const isInactive = INACTIVE_STATUSES.includes(
                    appointment.status,
                );

                return (
                    <div
                        key={appointment.id}
                        // Click-through for inactive appointments: the card re-enables pointer events only when it has a menu, so a static one never hides the free cell underneath.
                        className={cn(
                            'absolute inset-x-1 z-1',
                            isInactive && 'pointer-events-none opacity-60',
                        )}
                        style={{ top: slotTop + BLOCK_INSET_PX, height }}
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
    );
}
