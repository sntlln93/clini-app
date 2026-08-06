import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AvailableSlot } from '@/types/booking';

/** Fixed 60-day booking window, mirroring `ListAvailableSlotsAction::BOOKING_WINDOW_DAYS`. */
const BOOKING_WINDOW_DAYS = 60;

function toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatSlotTime(isoInstant: string, timeZone: string): string {
    return new Intl.DateTimeFormat('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone,
    }).format(new Date(isoInstant));
}

type BookingSlotPickerProps = {
    timezone: string;
    date?: string;
    slots: AvailableSlot[];
    onDateChange: (date: string) => void;
    onSlotSelect: (slot: AvailableSlot) => void;
    onBack: () => void;
};

/**
 * Day picker (native `<input type="date">`, no `calendar` primitive
 * installed in this project) plus the grid of available slots for that day.
 * The date is request state owned by the parent route's search params —
 * changing it re-runs the route loader, which is what actually fetches the
 * slots (ADR 0007); this component only reports the new date upward.
 */
export function BookingSlotPicker({
    timezone,
    date,
    slots,
    onDateChange,
    onSlotSelect,
    onBack,
}: BookingSlotPickerProps) {
    const today = new Date();
    const minDate = toDateInputValue(today);
    const maxDate = toDateInputValue(
        new Date(today.getTime() + BOOKING_WINDOW_DAYS * 24 * 60 * 60 * 1000),
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-lg font-semibold">Elegí día y horario</h1>
                <Button variant="ghost" size="sm" onClick={onBack}>
                    Volver
                </Button>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="booking-date">Día</Label>
                <Input
                    id="booking-date"
                    type="date"
                    value={date ?? ''}
                    min={minDate}
                    max={maxDate}
                    onChange={(event) => onDateChange(event.target.value)}
                />
            </div>

            {!date && (
                <p className="text-sm text-muted-foreground">
                    Elegí un día para ver los horarios disponibles.
                </p>
            )}

            {date && slots.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    No hay horarios disponibles para este día.
                </p>
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
