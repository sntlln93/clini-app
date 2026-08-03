import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

const DAY_ABBREVIATION_FORMAT = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
});

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function startOfWeek(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() - result.getDay());
    return result;
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function dayLabel(day: Date): string {
    const abbreviation = DAY_ABBREVIATION_FORMAT.format(day).replace('.', '');
    return `${abbreviation} ${day.getDate()}`;
}

type AgendaDayStripProps = {
    date: Date;
    onDateSelect: (date: Date) => void;
};

export function AgendaDayStrip({ date, onDateSelect }: AgendaDayStripProps) {
    const weekStart = startOfWeek(date);
    const days = Array.from({ length: 7 }, (_, index) =>
        addDays(weekStart, index),
    );

    const shiftWeek = (weeks: number) =>
        onDateSelect(addDays(date, weeks * 7));

    return (
        <div className="flex min-w-0 items-center gap-1">
            <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => shiftWeek(-1)}
                aria-label="Semana anterior"
            >
                <ChevronLeftIcon />
            </Button>

            <div className="flex min-w-0 gap-1 overflow-x-auto">
                {days.map((day) => {
                    const selected = isSameDay(day, date);

                    return (
                        <Button
                            key={day.toISOString()}
                            type="button"
                            variant={selected ? 'secondary' : 'ghost'}
                            size="sm"
                            aria-pressed={selected}
                            className="shrink-0 capitalize"
                            onClick={() => onDateSelect(day)}
                        >
                            {dayLabel(day)}
                        </Button>
                    );
                })}
            </div>

            <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => shiftWeek(1)}
                aria-label="Semana siguiente"
            >
                <ChevronRightIcon />
            </Button>
        </div>
    );
}
