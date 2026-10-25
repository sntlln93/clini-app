import { ListSkeleton } from '@/components/ListSkeleton';
import { Button } from '@/components/ui/button';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { ensureScopedProfessionals } from '@/hooks/use-professionals';
import {
    DateTime,
    fromCalendarDate,
    toCalendarDate,
    toInstant,
} from '@/lib/datetime';
import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { z } from 'zod';
import { rangeFor } from './-components/agenda-dates';
import { agendaNavigation } from './-components/agenda-navigation';
import { AgendaContent } from './-components/AgendaContent';
import { AgendaProfessionalFilter } from './-components/AgendaProfessionalFilter';
import { AgendaToolbar } from './-components/AgendaToolbar';
import { filterAgendaAppointments } from './-components/appointment-status';
import {
    AppointmentFormDialog,
    type AppointmentPrefill,
} from './-components/AppointmentFormDialog';
import { isProfessionalFilterEmpty } from './-components/professional-filter';
import { SetupChecklist } from './-components/SetupChecklist';
import { loadSetupProgress } from './-hooks/setup-progress';
import { useAppointmentPermissions } from './-hooks/use-appointment-permissions';
import { appointmentsQueryOptions } from './-hooks/use-appointments';

const agendaSearchSchema = z.object({
    date: z.string().optional(),
    view: z.enum(['day', 'week']).optional(),
    professionals: z.array(z.number()).optional(),
    // Presentation only: deliberately not a loader dep, the API still returns every status.
    showCancelled: z.boolean().optional(),
});

export const Route = createFileRoute('/_auth/agenda/')({
    head: () => titleHead('Agenda'),
    validateSearch: (search) => agendaSearchSchema.parse(search),
    // Today is resolved in the loader, not here: `loaderDeps` runs before `_auth`'s `beforeLoad` sets the practice's zone.
    loaderDeps: ({ search }) => ({
        date: search.date,
        view: search.view ?? 'day',
    }),
    loader: async ({ context, deps }) => {
        const { start, end } = rangeFor(
            deps.date ? fromCalendarDate(deps.date) : DateTime.now(),
            deps.view,
        );

        const [professionals, appointments, setupProgress] = await Promise.all([
            ensureScopedProfessionals(context.queryClient),
            context.queryClient.ensureQueryData(
                appointmentsQueryOptions({
                    from: toInstant(start),
                    to: toInstant(end),
                }),
            ),
            loadSetupProgress(context.queryClient),
        ]);

        return { professionals, appointments, setupProgress };
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
        showCancelled = false,
    } = Route.useSearch();
    const navigate = Route.useNavigate();
    const {
        professionals,
        appointments: loadedAppointments,
        setupProgress,
    } = Route.useLoaderData();
    // The checklist already explains an empty agenda to whoever can fix it.
    const showSetup = setupProgress !== null && !setupProgress.ready;
    // Cancelled/rescheduled appointments no longer hold their slot, so by default they don't cover it either.
    const appointments = filterAgendaAppointments(
        loadedAppointments,
        showCancelled,
    );
    const { canCreate, canUpdate } = useAppointmentPermissions();
    const [formState, setFormState] = useState<FormState>(CLOSED_FORM);

    const date = dateParam ? fromCalendarDate(dateParam) : DateTime.now();
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

    const navigation = agendaNavigation({
        date,
        view,
        professionalsCount: professionals.length,
        setSearch: (patch) =>
            void navigate({ search: (prev) => ({ ...prev, ...patch }) }),
    });

    const handleNewAppointment = () => setFormState({ open: true });

    const handleCellClick = (membershipId: number, hour: number) => {
        setFormState({
            open: true,
            prefill: {
                membershipId,
                date: toCalendarDate(date),
                time: `${String(hour).padStart(2, '0')}:00`,
            },
        });
    };

    // The week grid has no professional axis, so only the date is prefilled (#134).
    const handleDayClick = (day: DateTime) => {
        setFormState({
            open: true,
            prefill: { date: toCalendarDate(day) },
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl tracking-tight">Agenda</h1>
                    <p className="text-sm text-muted-foreground">
                        Turnos agendados por profesional.
                    </p>
                </div>
                {creatableProfessionals.length > 0 && (
                    <Button onClick={handleNewAppointment}>Nuevo turno</Button>
                )}
            </div>

            {showSetup && <SetupChecklist progress={setupProgress} />}

            {professionals.length > 0 && (
                <AgendaProfessionalFilter
                    professionals={professionals}
                    selectedIds={
                        selectedProfessionalIds ??
                        professionals.map((professional) => professional.id)
                    }
                    onChange={navigation.onProfessionalsChange}
                />
            )}

            {/* The landing's agenda card: title and view switch on top, the grid, and the legend as its footer. */}
            <section
                aria-label="Turnos"
                className="min-w-0 overflow-hidden rounded-3xl border bg-card shadow-card"
            >
                <AgendaToolbar
                    date={date}
                    view={view}
                    onPrev={navigation.onPrev}
                    onNext={navigation.onNext}
                    onToday={navigation.onToday}
                    onViewChange={navigation.onViewChange}
                    onDateSelect={navigation.updateDate}
                    showCancelled={showCancelled}
                    onShowCancelledChange={navigation.onShowCancelledChange}
                />

                <AgendaContent
                    date={date}
                    view={view}
                    professionals={professionals}
                    visibleProfessionals={visibleProfessionals}
                    appointments={appointments}
                    showSetup={showSetup}
                    noneVisibleFromFilter={noneVisibleFromFilter}
                    canCreate={canCreate}
                    canUpdate={canUpdate}
                    onCellClick={handleCellClick}
                    onDayClick={handleDayClick}
                    onToday={navigation.onToday}
                    onShowAllProfessionals={() =>
                        navigation.onProfessionalsChange(
                            professionals.map(
                                (professional) => professional.id,
                            ),
                        )
                    }
                />
            </section>

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
