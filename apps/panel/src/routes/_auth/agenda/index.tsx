import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { Button } from '@/components/ui/button';
import { ensureScopedProfessionals } from '@/hooks/use-professionals';
import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import {
    addDays,
    fromDateInputValue,
    rangeFor,
    toDateInputValue,
} from './-components/agenda-dates';
import { AgendaDayView } from './-components/AgendaDayView';
import { AgendaProfessionalFilter } from './-components/AgendaProfessionalFilter';
import {
    AgendaToolbar,
    type AgendaViewMode,
} from './-components/AgendaToolbar';
import { AgendaWeekView } from './-components/AgendaWeekView';
import {
    AppointmentFormDialog,
    type AppointmentPrefill,
} from './-components/AppointmentFormDialog';
import { isProfessionalFilterEmpty } from './-components/professional-filter';
import { useAppointmentPermissions } from './-hooks/use-appointment-permissions';
import { appointmentsQueryOptions } from './-hooks/use-appointments';

const agendaSearchSchema = z.object({
    date: z.string().optional(),
    view: z.enum(['day', 'week']).optional(),
    professionals: z.array(z.number()).optional(),
});

export const Route = createFileRoute('/_auth/agenda/')({
    head: () => titleHead('Agenda'),
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
            ensureScopedProfessionals(context.queryClient),
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
    const {
        date: dateParam,
        view = 'day',
        professionals: selectedProfessionalIds,
    } = Route.useSearch();
    const navigate = Route.useNavigate();
    const { professionals, appointments } = Route.useLoaderData();
    const { canCreate, canUpdate } = useAppointmentPermissions();
    const [formState, setFormState] = useState<FormState>(CLOSED_FORM);

    const date = dateParam ? fromDateInputValue(dateParam) : new Date();
    const { start: rangeStart } = rangeFor(date, view);
    const creatableProfessionals = professionals.filter(canCreate);
    const visibleProfessionals = selectedProfessionalIds
        ? professionals.filter((professional) =>
              selectedProfessionalIds.includes(professional.id),
          )
        : professionals;
    const noneVisibleFromFilter = isProfessionalFilterEmpty(
        professionals.length,
        visibleProfessionals.length,
        selectedProfessionalIds,
    );

    function updateDate(next: Date) {
        void navigate({
            search: (prev) => ({ ...prev, date: toDateInputValue(next) }),
        });
    }

    const handleProfessionalsChange = (ids: number[]) => {
        void navigate({
            search: (prev) => ({
                ...prev,
                professionals:
                    ids.length === professionals.length ? undefined : ids,
            }),
        });
    };

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

    // The week grid has no professional axis, so only the date is prefilled (#134).
    const handleDayClick = (day: Date) => {
        setFormState({
            open: true,
            prefill: { date: toDateInputValue(day) },
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

            {professionals.length > 0 && (
                <AgendaProfessionalFilter
                    professionals={professionals}
                    selectedIds={
                        selectedProfessionalIds ??
                        professionals.map((professional) => professional.id)
                    }
                    onChange={handleProfessionalsChange}
                />
            )}

            <AgendaToolbar
                date={date}
                view={view}
                onPrev={handlePrev}
                onNext={handleNext}
                onToday={handleToday}
                onViewChange={handleViewChange}
                onDateSelect={updateDate}
            />

            {professionals.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay profesionales en esta organización.
                </p>
            )}

            {noneVisibleFromFilter && (
                <p className="text-sm text-muted-foreground">
                    No hay profesionales seleccionados en el filtro.
                </p>
            )}

            {visibleProfessionals.length > 0 &&
                (view === 'day' ? (
                    <AgendaDayView
                        date={date}
                        professionals={visibleProfessionals}
                        appointments={appointments}
                        canUpdate={canUpdate}
                        canCreate={canCreate}
                        onCellClick={handleCellClick}
                    />
                ) : (
                    <AgendaWeekView
                        weekStart={rangeStart}
                        professionals={visibleProfessionals}
                        appointments={appointments}
                        canUpdate={canUpdate}
                        canCreate={canCreate}
                        onDayClick={handleDayClick}
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
