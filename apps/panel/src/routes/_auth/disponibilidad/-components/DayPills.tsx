import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { WeekDraft } from './week-draft';
import {
    DAY_NAMES,
    DAY_SHORT_NAMES,
    DISPLAY_ORDER,
    rangeCountLabel,
} from './week-labels';

type DayPillsProps = {
    week: WeekDraft;
    selectedDay: number;
    onSelectDay: (day: number) => void;
};

/**
 * The mobile day picker; a dot marks the days with ranges. Seven 44px pills
 * don't fit a 320px screen, so they keep the 44px height and share the width.
 */
export function DayPills({ week, selectedDay, onSelectDay }: DayPillsProps) {
    return (
        <ToggleGroup
            value={[String(selectedDay)]}
            onValueChange={(value) => {
                if (value.length > 0) {
                    onSelectDay(Number(value[0]));
                }
            }}
            aria-label="Día"
            spacing={1}
            className="grid w-full grid-cols-7"
        >
            {DISPLAY_ORDER.map((day) => (
                <ToggleGroupItem
                    key={day}
                    value={String(day)}
                    variant="outline"
                    aria-label={`${DAY_NAMES[day]}, ${rangeCountLabel(week[day].length).toLowerCase()}`}
                    className="touch-target-exempt h-14 min-w-0 flex-col gap-1 rounded-2xl px-0 aria-pressed:border-primary aria-pressed:bg-muted/60 aria-pressed:text-primary"
                >
                    <span>{DAY_SHORT_NAMES[day]}</span>
                    <span
                        aria-hidden
                        className={cn(
                            'size-1.5 rounded-full',
                            week[day].length > 0
                                ? 'bg-primary'
                                : 'bg-muted-foreground/40',
                        )}
                    />
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
