import { Button } from '@/components/ui/button';
import { DateTime, isSameDay, startOfWeek } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

function dayLabel(day: DateTime): string {
    const abbreviation = day
        .toLocaleString({ weekday: 'short' })
        .replace('.', '');
    return `${abbreviation} ${day.day}`;
}

type AgendaDayStripProps = {
    date: DateTime;
    onDateSelect: (date: DateTime) => void;
};

export function AgendaDayStrip({ date, onDateSelect }: AgendaDayStripProps) {
    const weekStart = startOfWeek(date);
    const days = Array.from({ length: 7 }, (_, index) =>
        weekStart.plus({ days: index }),
    );
    const today = DateTime.now();

    const shiftWeek = (weeks: number) => onDateSelect(date.plus({ weeks }));

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
                    const isToday = isSameDay(day, today);

                    return (
                        <Button
                            key={day.toISODate()}
                            type="button"
                            variant={selected ? 'default' : 'ghost'}
                            size="sm"
                            aria-pressed={selected}
                            aria-current={isToday ? 'date' : undefined}
                            className={cn(
                                'shrink-0 capitalize tabular-nums',
                                isToday &&
                                    'font-semibold underline underline-offset-4',
                                isToday && !selected && 'text-primary',
                            )}
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
