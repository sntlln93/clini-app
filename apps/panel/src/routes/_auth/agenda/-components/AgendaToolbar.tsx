import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useId } from 'react';
import { AgendaDayStrip } from './AgendaDayStrip';

export type AgendaViewMode = 'day' | 'week';

type AgendaToolbarProps = {
    date: Date;
    view: AgendaViewMode;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewChange: (view: AgendaViewMode) => void;
    onDateSelect: (date: Date) => void;
    showCancelled: boolean;
    onShowCancelledChange: (value: boolean) => void;
};

const DATE_LABEL_FORMAT = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

export function AgendaToolbar({
    date,
    view,
    onPrev,
    onNext,
    onToday,
    onViewChange,
    onDateSelect,
    showCancelled,
    onShowCancelledChange,
}: AgendaToolbarProps) {
    const showCancelledId = useId();

    // Shared by both views: a way back to today plus the full date, since the day strip alone shows neither month nor year.
    const todayButton = (
        <Button variant="outline" size="sm" onClick={onToday}>
            Hoy
        </Button>
    );
    const dateLabel = (
        <span className="min-w-0 text-sm font-medium capitalize">
            {DATE_LABEL_FORMAT.format(date)}
        </span>
    );

    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            {view === 'day' ? (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <AgendaDayStrip date={date} onDateSelect={onDateSelect} />
                    {todayButton}
                    {dateLabel}
                </div>
            ) : (
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onPrev}
                        aria-label="Período anterior"
                    >
                        <ChevronLeftIcon />
                    </Button>
                    {todayButton}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onNext}
                        aria-label="Período siguiente"
                    >
                        <ChevronRightIcon />
                    </Button>
                    <span className="ml-2 min-w-0">{dateLabel}</span>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <Switch
                        id={showCancelledId}
                        checked={showCancelled}
                        onCheckedChange={onShowCancelledChange}
                    />
                    <Label htmlFor={showCancelledId}>Mostrar cancelados</Label>
                </div>

                <div className="flex items-center gap-1 rounded-lg border p-0.5">
                    <Button
                        variant={view === 'day' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => onViewChange('day')}
                    >
                        Día
                    </Button>
                    <Button
                        variant={view === 'week' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => onViewChange('week')}
                    >
                        Semana
                    </Button>
                </div>
            </div>
        </div>
    );
}
