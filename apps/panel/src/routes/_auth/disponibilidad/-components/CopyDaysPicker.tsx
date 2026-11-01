import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import {
    copyDaysDescription,
    DAY_NAMES,
    DAY_SHORT_NAMES,
    DISPLAY_ORDER,
} from './week-labels';

type CopyDaysPickerProps = {
    from: number;
    onCopy: (days: number[]) => void;
    /** Off where a sheet's own title and description already say it. */
    withHeading?: boolean;
};

/** Picks the days that get a copy of `from`'s ranges, replacing theirs. */
export function CopyDaysPicker({
    from,
    onCopy,
    withHeading = true,
}: CopyDaysPickerProps) {
    const [days, setDays] = useState<string[]>([]);

    function copy() {
        onCopy(days.map(Number));
        setDays([]);
    }

    return (
        <div className="space-y-3">
            {withHeading && (
                <div className="space-y-1">
                    <p className="text-sm font-medium">Copiar a otros días</p>
                    <p className="text-xs text-muted-foreground">
                        {copyDaysDescription(from)}
                    </p>
                </div>
            )}
            <ToggleGroup
                multiple
                value={days}
                onValueChange={setDays}
                aria-label="Días a los que copiar"
                className="flex-wrap"
            >
                {DISPLAY_ORDER.filter((day) => day !== from).map((day) => (
                    <ToggleGroupItem
                        key={day}
                        value={String(day)}
                        variant="outline"
                        aria-label={DAY_NAMES[day]}
                        className="rounded-full aria-pressed:border-primary aria-pressed:bg-muted/60 aria-pressed:text-primary"
                    >
                        {DAY_SHORT_NAMES[day]}
                    </ToggleGroupItem>
                ))}
            </ToggleGroup>
            <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={days.length === 0}
                onClick={copy}
            >
                <Copy data-icon="inline-start" aria-hidden />
                Copiar a otros días
            </Button>
        </div>
    );
}
