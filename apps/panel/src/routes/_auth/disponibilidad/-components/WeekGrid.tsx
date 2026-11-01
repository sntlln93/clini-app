import { cn } from '@/lib/utils';
import type { WeekDraftActions } from '../-hooks/use-week-draft';
import { DayColumn } from './DayColumn';
import { HourRail } from './HourRail';
import { gridBounds, type WeekDraft } from './week-draft';
import { DAY_NAMES, DAY_SHORT_NAMES, DISPLAY_ORDER } from './week-labels';

type WeekGridProps = {
    week: WeekDraft;
    selectedDay: number;
    canManage: boolean;
    onSelectDay: (day: number) => void;
    actions: WeekDraftActions;
};

/** The desktop week: seven columns, Monday first, over an hour rail. */
export function WeekGrid({
    week,
    selectedDay,
    canManage,
    onSelectDay,
    actions,
}: WeekGridProps) {
    const bounds = gridBounds(week);

    return (
        <div className="overflow-x-auto">
            <div className="min-w-xl pb-3">
                <div className="flex pl-12">
                    {DISPLAY_ORDER.map((day) => (
                        <button
                            key={day}
                            type="button"
                            aria-label={DAY_NAMES[day]}
                            aria-pressed={day === selectedDay}
                            onClick={() => onSelectDay(day)}
                            className={cn(
                                'min-w-0 flex-1 rounded-t-xl focus-ring px-1 py-2 text-sm font-medium',
                                day === selectedDay
                                    ? 'bg-muted/60 text-primary'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <span className="xl:hidden">
                                {DAY_SHORT_NAMES[day]}
                            </span>
                            <span className="hidden xl:inline">
                                {DAY_NAMES[day]}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex border-t pt-2">
                    <HourRail bounds={bounds} />
                    {DISPLAY_ORDER.map((day) => (
                        <DayColumn
                            key={day}
                            day={day}
                            ranges={week[day]}
                            bounds={bounds}
                            selected={day === selectedDay}
                            draggable={canManage}
                            onBlockClick={() => onSelectDay(day)}
                            onSelect={() => onSelectDay(day)}
                            onCreate={(range) => {
                                actions.add(day, range);
                                onSelectDay(day);
                            }}
                            onChange={(index, range) => {
                                actions.replace(day, index, range);
                                onSelectDay(day);
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
