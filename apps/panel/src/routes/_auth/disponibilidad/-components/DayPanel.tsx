import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus } from 'lucide-react';
import type { WeekDraftActions } from '../-hooks/use-week-draft';
import { CopyDaysPicker } from './CopyDaysPicker';
import { RangeRow } from './RangeRow';
import { nextFreeRange, type Range } from './week-draft';
import { DAY_NAMES, rangeCountLabel } from './week-labels';

type DayPanelProps = {
    day: number;
    ranges: readonly Range[];
    canManage: boolean;
    actions: WeekDraftActions;
};

/**
 * The selected day's ranges as time inputs: everything the grid does by
 * dragging can be done here by keyboard (WCAG 2.5.7).
 */
export function DayPanel({ day, ranges, canManage, actions }: DayPanelProps) {
    const free = nextFreeRange(ranges);

    return (
        <section aria-labelledby="day-panel-title" className="space-y-4">
            <div className="space-y-1">
                <h3 id="day-panel-title" className="text-lg font-medium">
                    {DAY_NAMES[day]}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {rangeCountLabel(ranges.length)}
                </p>
            </div>

            {ranges.length > 0 && (
                <ul className="space-y-3" aria-label="Franjas del día">
                    {ranges.map((range, index) => (
                        <RangeRow
                            key={index}
                            range={range}
                            canManage={canManage}
                            onCommit={(next) =>
                                actions.replace(day, index, next)
                            }
                            onRemove={() => actions.remove(day, index)}
                        />
                    ))}
                </ul>
            )}

            {canManage && (
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={free === null}
                        onClick={() => free && actions.add(day, free)}
                    >
                        <Plus data-icon="inline-start" aria-hidden />
                        Agregar franja
                    </Button>
                    <Separator />
                    <CopyDaysPicker
                        key={day}
                        from={day}
                        onCopy={(days) => actions.copy(day, days)}
                    />
                </>
            )}
        </section>
    );
}
