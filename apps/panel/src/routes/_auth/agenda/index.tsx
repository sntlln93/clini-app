import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { Button } from '@/components/ui/button';
import { professionalsQueryOptions } from '@/hooks/use-professionals';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
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
import { appointmentsQueryOptions } from './-hooks/use-appointments';

const agendaSearchSchema = z.object({
    date: z.string().optional(),
    view: z.enum(['day', 'week']).optional(),
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

function toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function fromDateInputValue(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
}

function rangeFor(date: Date, view: AgendaViewMode) {
    return view === 'day'
        ? { start: startOfDay(date), end: endOfDay(date) }
        : { start: startOfWeek(date), end: endOfWeek(date) };
}

export const Route = createFileRoute('/_auth/agenda/')({
    validateSearch: (search) => agendaSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({
        date: search.date ?? toDateInputValue(new Date()),
        view: search.view ?? 'day',
    }),
    loader: async ({ context, deps }) => {
        const { start, end } = rangeFor(
            fromDateInputValue(deps.date),
            deps.view,
        );

        const [professionals, appointments] = await Promise.all([
            context.queryClient.ensureQueryData(professionalsQueryOptions()),
            context.queryClient.ensureQueryData(
                appointmentsQueryOptions({
                    from: start.toISOString(),
                    to: end.toISOString(),
                }),
            ),
        ]);

        return { professionals, appointments };
    },
    pendingComponent: () => <ListSkeleton rows={5} />,
    errorComponent: RouteErrorState,
    component: AgendaPage,
});

type FormState = {
    open: boolean;
    prefill?: AppointmentPrefill;
};

const CLOSED_FORM: FormState = { open: false };

function AgendaPage() {
    const { date: dateParam, view = 'day' } = Route.useSearch();
    const navigate = Route.useNavigate();
    const { professionals, appointments } = Route.useLoaderData();
    const { canCreate, canUpdate } = useAppointmentPermissions();
    const [formState, setFormState] = useState<FormState>(CLOSED_FORM);

    const date = dateParam ? fromDateInputValue(dateParam) : new Date();
    const { start: rangeStart } = rangeFor(date, view);
    const creatableProfessionals = professionals.filter(canCreate);

    function updateDate(next: Date) {
        void navigate({
            search: (prev) => ({ ...prev, date: toDateInputValue(next) }),
        });
    }

    const handlePrev = () =>
        updateDate(addDays(date, view === 'day' ? -1 : -7));
    const handleNext = () => updateDate(addDays(date, view === 'day' ? 1 : 7));
    const handleToday = () => updateDate(new Date());
    const handleViewChange = (nextView: AgendaViewMode) =>
        void navigate({ search: (prev) => ({ ...prev, view: nextView }) });

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
                {creatableProfessionals.length > 0 && (
                    <Button onClick={handleNewAppointment}>Nuevo turno</Button>
                )}
            </div>

            <AgendaToolbar
                date={date}
                view={view}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                onViewChange={handleViewChange}
            />

            {professionals.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay profesionales en esta organización.
                </p>
            )}

            {professionals.length > 0 &&
                (view === 'day' ? (
                    <AgendaDayView
                        date={date}
                        professionals={professionals}
                        appointments={appointments}
                        canUpdate={canUpdate}
                        canCreate={canCreate}
                        onCellClick={handleCellClick}
                    />
                ) : (
                    <AgendaWeekView
                        weekStart={rangeStart}
                        professionals={professionals}
                        appointments={appointments}
                        canUpdate={canUpdate}
                    />
                ))}

            <AppointmentFormDialog
                open={formState.open}
                onOpenChange={(open) =>
                    setFormState((previous) => ({ ...previous, open }))
                }
                professionals={creatableProfessionals}
                prefill={formState.prefill}
            />
        </div>
    );
}
