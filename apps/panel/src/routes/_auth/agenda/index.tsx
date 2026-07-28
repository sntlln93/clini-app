import { ListSkeleton } from '@/components/ListSkeleton';
import { QueryErrorState } from '@/components/QueryErrorState';
import { Button } from '@/components/ui/button';
import { useProfessionals } from '@/hooks/use-professionals';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AgendaDayView } from './-components/AgendaDayView';
import {
    AgendaToolbar,
    type AgendaViewMode,
} from './-components/AgendaToolbar';
import { AgendaWeekView } from './-components/AgendaWeekView';
import {
    AppointmentFormDialog,
    type AppointmentPrefill,
} from './-components/AppointmentFormDialog';
import { useAppointmentPermissions } from './-hooks/use-appointment-permissions';
import { useAppointments } from './-hooks/use-appointments';

export const Route = createFileRoute('/_auth/agenda/')({
    component: AgendaPage,
});

type FormState = {
    open: boolean;
    prefill?: AppointmentPrefill;
};

const CLOSED_FORM: FormState = { open: false };

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

function toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function AgendaPage() {
    const [view, setView] = useState<AgendaViewMode>('day');
    const [date, setDate] = useState(() => new Date());
    const [formState, setFormState] = useState<FormState>(CLOSED_FORM);

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

    const handleNewAppointment = () => setFormState({ open: true });

    const handleCellClick = (membershipId: number, hour: number) => {
        setFormState({
            open: true,
            prefill: {
                membershipId,
                date: toDateInputValue(date),
                time: `${String(hour).padStart(2, '0')}:00`,
            },
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold">Agenda</h1>
                    <p className="text-sm text-muted-foreground">
                        Turnos agendados por profesional.
                    </p>
                </div>
                <Button onClick={handleNewAppointment}>Nuevo turno</Button>
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

            {!isError && isPending && <ListSkeleton rows={5} />}

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
                        onCellClick={handleCellClick}
                    />
                ) : (
                    <AgendaWeekView
                        weekStart={rangeStart}
                        professionals={professionals}
                        appointments={appointments ?? []}
                        canUpdate={canUpdate}
                    />
                ))}

            <AppointmentFormDialog
                open={formState.open}
                onOpenChange={(open) =>
                    setFormState((previous) => ({ ...previous, open }))
                }
                professionals={professionals ?? []}
                prefill={formState.prefill}
            />
        </div>
    );
}
