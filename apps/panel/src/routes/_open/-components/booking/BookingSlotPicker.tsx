import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { addDaysToIsoDate, todayInTimeZone } from '@/lib/iso-date';
import type { AvailableSlot } from '@/types/booking';
import type { ReactNode } from 'react';
import { BookingDayNavigator } from './BookingDayNavigator';
import { formatSlotTime } from './booking-format';

/** Fixed 60-day booking window, mirroring `ListAvailableSlotsAction::BOOKING_WINDOW_DAYS`. */
const BOOKING_WINDOW_DAYS = 60;

type BookingSlotPickerProps = {
    timezone: string;
    date?: string;
    slots: AvailableSlot[];
    summary: ReactNode;
    /** Shown above the grid, e.g. after the chosen time was taken by someone else. */
    notice?: string;
    onDateChange: (date: string) => void;
    onSlotSelect: (slot: AvailableSlot) => void;
    onBack: () => void;
};

/**
 * The window is computed in the practice's zone, the same one the slots
 * use. The parent route's loader does the fetching; this component only
 * reports the date upward.
 */
export function BookingSlotPicker({
    timezone,
    date,
    slots,
    summary,
    notice,
    onDateChange,
    onSlotSelect,
    onBack,
}: BookingSlotPickerProps) {
    const minDate = todayInTimeZone(timezone);
    const maxDate = addDaysToIsoDate(minDate, BOOKING_WINDOW_DAYS);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg font-semibold">Elegí día y horario</h1>
                <Button variant="ghost" size="sm" onClick={onBack}>
                    Volver
                </Button>
            </div>

            {summary}

            {notice && (
                <Alert>
                    <AlertTitle>{notice}</AlertTitle>
                </Alert>
            )}

            <BookingDayNavigator
                date={date}
                minDate={minDate}
                maxDate={maxDate}
                onDateChange={onDateChange}
            />

            {!date && (
                <p className="text-sm text-muted-foreground">
                    Elegí un día para ver los horarios disponibles.
                </p>
            )}

            {date && slots.length === 0 && (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        No hay horarios disponibles para este día.
                    </p>
                    {date < maxDate && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                onDateChange(addDaysToIsoDate(date, 1))
                            }
                        >
                            Ver el día siguiente
                        </Button>
                    )}
                </div>
            )}

            {date && slots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                        <Button
                            key={slot.start_at}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onSlotSelect(slot)}
                        >
                            {formatSlotTime(slot.start_at, timezone)}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
