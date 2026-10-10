import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addDaysToIsoDate, formatLongIsoDate } from '@/lib/iso-date';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

type BookingDayNavigatorProps = {
    date?: string;
    minDate: string;
    maxDate: string;
    onDateChange: (date: string) => void;
};

/** A native `<input type="date">` (no `calendar` primitive is installed) plus one-tap day stepping inside the booking window. */
export function BookingDayNavigator({
    date,
    minDate,
    maxDate,
    onDateChange,
}: BookingDayNavigatorProps) {
    return (
        <div className="space-y-2">
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

            {date && (
                <div className="flex items-center justify-between gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={date <= minDate}
                        onClick={() => onDateChange(addDaysToIsoDate(date, -1))}
                    >
                        <ChevronLeftIcon data-icon="inline-start" />
                        Día anterior
                    </Button>
                    <p className="min-w-0 text-center text-sm font-medium tabular-nums first-letter:uppercase">
                        {formatLongIsoDate(date)}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={date >= maxDate}
                        onClick={() => onDateChange(addDaysToIsoDate(date, 1))}
                    >
                        Día siguiente
                        <ChevronRightIcon data-icon="inline-end" />
                    </Button>
                </div>
            )}
        </div>
    );
}
