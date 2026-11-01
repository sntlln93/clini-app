import { Button } from '@/components/ui/button';
import { Copy, Plus } from 'lucide-react';
import { useState } from 'react';
import type { WeekDraftActions } from '../-hooks/use-week-draft';
import { CopyDaysSheet } from './CopyDaysSheet';
import { DayColumn } from './DayColumn';
import { DayPills } from './DayPills';
import { HourRail } from './HourRail';
import { RangeSheet, type SheetTarget } from './RangeSheet';
import { gridBounds, nextFreeRange, type WeekDraft } from './week-draft';
import { DAY_NAMES, rangeCountLabel } from './week-labels';

type MobileWeekProps = {
    week: WeekDraft;
    selectedDay: number;
    canManage: boolean;
    onSelectDay: (day: number) => void;
    actions: WeekDraftActions;
};

/** One day at a time, without dragging: a range is edited in a bottom sheet. */
export function MobileWeek({
    week,
    selectedDay,
    canManage,
    onSelectDay,
    actions,
}: MobileWeekProps) {
    const [target, setTarget] = useState<SheetTarget | null>(null);
    const [copyFrom, setCopyFrom] = useState<number | null>(null);
    const ranges = week[selectedDay];
    const free = nextFreeRange(ranges);

    return (
        <div className="space-y-4">
            <DayPills
                week={week}
                selectedDay={selectedDay}
                onSelectDay={onSelectDay}
            />

            <div className="space-y-3 rounded-3xl border p-4">
                <div className="space-y-0.5">
                    <h3 className="text-lg font-medium">
                        {DAY_NAMES[selectedDay]}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {canManage && ranges.length > 0
                            ? 'Tocá una franja para editarla.'
                            : rangeCountLabel(ranges.length)}
                    </p>
                </div>
                <div className="flex pt-2">
                    <HourRail bounds={gridBounds(week)} />
                    <DayColumn
                        day={selectedDay}
                        ranges={ranges}
                        bounds={gridBounds(week)}
                        selected={false}
                        draggable={false}
                        onBlockClick={
                            canManage
                                ? (index) =>
                                      setTarget({
                                          day: selectedDay,
                                          index,
                                          range: ranges[index],
                                      })
                                : undefined
                        }
                    />
                </div>
            </div>

            {canManage && (
                <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={free === null}
                        onClick={() =>
                            free &&
                            setTarget({
                                day: selectedDay,
                                index: null,
                                range: free,
                            })
                        }
                    >
                        <Plus data-icon="inline-start" aria-hidden />
                        Agregar franja
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCopyFrom(selectedDay)}
                    >
                        <Copy data-icon="inline-start" aria-hidden />
                        Copiar a otros días
                    </Button>
                </div>
            )}

            <RangeSheet
                target={target}
                onClose={() => setTarget(null)}
                onApply={(current, range) => {
                    if (current.index === null) {
                        actions.add(current.day, range);
                    } else {
                        actions.replace(current.day, current.index, range);
                    }
                    setTarget(null);
                }}
                onRemove={(current) => {
                    if (current.index !== null) {
                        actions.remove(current.day, current.index);
                    }
                    setTarget(null);
                }}
            />
            <CopyDaysSheet
                from={copyFrom}
                onClose={() => setCopyFrom(null)}
                onCopy={(from, days) => {
                    actions.copy(from, days);
                    setCopyFrom(null);
                }}
            />
        </div>
    );
}
