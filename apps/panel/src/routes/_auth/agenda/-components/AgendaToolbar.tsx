import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
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
}: AgendaToolbarProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            {view === 'day' ? (
                <AgendaDayStrip date={date} onDateSelect={onDateSelect} />
            ) : (
                <div className="flex flex-wrap items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onPrev}
                        aria-label="Período anterior"
                    >
                        <ChevronLeftIcon />
                    </Button>
                    <Button variant="outline" size="sm" onClick={onToday}>
                        Hoy
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onNext}
                        aria-label="Período siguiente"
                    >
                        <ChevronRightIcon />
                    </Button>
                    <span className="ml-2 text-sm font-medium capitalize">
                        {DATE_LABEL_FORMAT.format(date)}
                    </span>
                </div>
            )}

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
    );
}
