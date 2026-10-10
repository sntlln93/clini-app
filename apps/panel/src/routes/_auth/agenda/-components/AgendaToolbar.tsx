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

    // Shared by both views: a way back to today; the full date is the card title, since the day strip alone shows neither month nor year.
    const todayButton = (
        <Button variant="outline" size="sm" onClick={onToday}>
            Hoy
        </Button>
    );
    // The agenda card's title, as in the landing's agenda example.
    const dateLabel = (
        <h2 className="min-w-0 text-lg font-medium tabular-nums first-letter:uppercase">
            {DATE_LABEL_FORMAT.format(date)}
        </h2>
    );
    const viewOption = (mode: AgendaViewMode, label: string) => (
        <Button
            variant={view === mode ? 'default' : 'outline'}
            size="sm"
            aria-pressed={view === mode}
            className="px-3.5"
            onClick={() => onViewChange(mode)}
        >
            {label}
        </Button>
    );

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
            {dateLabel}
            <div role="group" aria-label="Vista" className="flex gap-1.5">
                {viewOption('day', 'Día')}
                {viewOption('week', 'Semana')}
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 lg:ml-auto">
                {view === 'day' ? (
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <AgendaDayStrip
                            date={date}
                            onDateSelect={onDateSelect}
                        />
                        {todayButton}
                    </div>
                ) : (
                    <div className="flex items-center gap-1">
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
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <Switch
                        id={showCancelledId}
                        checked={showCancelled}
                        onCheckedChange={onShowCancelledChange}
                    />
                    <Label htmlFor={showCancelledId}>Mostrar cancelados</Label>
                </div>
            </div>
        </div>
    );
}
