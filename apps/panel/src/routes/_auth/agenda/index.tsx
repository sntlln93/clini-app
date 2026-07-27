import { QueryErrorState } from '@/components/QueryErrorState';
import { useProfessionals } from '@/hooks/use-professionals';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AgendaDayView } from './-components/AgendaDayView';
import {
    AgendaToolbar,
    type AgendaViewMode,
} from './-components/AgendaToolbar';
import { AgendaWeekView } from './-components/AgendaWeekView';
import { useAppointmentPermissions } from './-hooks/use-appointment-permissions';
import { useAppointments } from './-hooks/use-appointments';

export const Route = createFileRoute('/_auth/agenda/')({
    component: AgendaPage,
});

function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

function startOfWeek(date: Date): Date {
    const result = startOfDay(date);
    result.setDate(result.getDate() - result.getDay());
    return result;
}

function endOfWeek(date: Date): Date {
    return endOfDay(addDays(startOfWeek(date), 6));
}

function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function AgendaPage() {
    const [view, setView] = useState<AgendaViewMode>('day');
    const [date, setDate] = useState(() => new Date());

    const { data: professionals } = useProfessionals();
    const { canUpdate } = useAppointmentPermissions();

    const rangeStart = view === 'day' ? startOfDay(date) : startOfWeek(date);
    const rangeEnd = view === 'day' ? endOfDay(date) : endOfWeek(date);

    const {
        data: appointments,
        isPending,
        isError,
        error,
    } = useAppointments({
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
    });

    const handlePrev = () =>
        setDate((current) => addDays(current, view === 'day' ? -1 : -7));
    const handleNext = () =>
        setDate((current) => addDays(current, view === 'day' ? 1 : 7));
    const handleToday = () => setDate(new Date());

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold">Agenda</h1>
                <p className="text-sm text-muted-foreground">
                    Turnos agendados por profesional.
                </p>
            </div>

            <AgendaToolbar
                date={date}
                view={view}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                onViewChange={setView}
            />

            {isError && <QueryErrorState error={error} />}

            {!isError && isPending && (
                <p className="text-sm text-muted-foreground">Cargando…</p>
            )}

            {!isError && !isPending && (professionals?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay profesionales en esta organización.
                </p>
            )}

            {!isError &&
                !isPending &&
                professionals &&
                professionals.length > 0 &&
                (view === 'day' ? (
                    <AgendaDayView
                        date={date}
                        professionals={professionals}
                        appointments={appointments ?? []}
                        canUpdate={canUpdate}
                    />
                ) : (
                    <AgendaWeekView
                        weekStart={rangeStart}
                        professionals={professionals}
                        appointments={appointments ?? []}
                        canUpdate={canUpdate}
                    />
                ))}
        </div>
    );
}
