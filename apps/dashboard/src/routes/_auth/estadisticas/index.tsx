import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { SEARCH_DEBOUNCE_MS } from '@/features/Searchbar';
import { formatLocalDate } from '@/lib/format';
import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AppointmentRatesCards } from './-components/AppointmentRatesCards';
import { AppointmentsByOriginChart } from './-components/AppointmentsByOriginChart';
import { AppointmentsByStatusChart } from './-components/AppointmentsByStatusChart';
import { AppointmentsPerDayChart } from './-components/AppointmentsPerDayChart';
import { PatientsCard } from './-components/PatientsCard';
import { RemindersCard } from './-components/RemindersCard';
import {
    StatsFilters,
    type StatsFilterValues,
} from './-components/StatsFilters';
import { statsQueryOptions } from './-hooks/use-stats';

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// All optional: an omitted bound is the API's default, shown back from `period`.
const statsSearchSchema = z.object({
    from: ymd.optional().catch(undefined),
    to: ymd.optional().catch(undefined),
    organization_id: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/estadisticas/')({
    head: () => titleHead('Estadísticas'),
    validateSearch: (search) => statsSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({
        from: search.from,
        to: search.to,
        organization_id: search.organization_id,
    }),
    loader: ({ context, deps }) =>
        context.queryClient.ensureQueryData(statsQueryOptions(deps)),
    // Paired with the filters' debounced commits (`useDateRangeDraft`), so a filter edit doesn't swap the page for its skeleton at once.
    pendingMs: SEARCH_DEBOUNCE_MS,
    pendingComponent: () => <ListSkeleton rows={4} />,
    errorComponent: RouteErrorState,
    component: EstadisticasPage,
});

function EstadisticasPage() {
    const stats = Route.useLoaderData();
    const navigate = Route.useNavigate();
    const { period } = stats;

    function handleFiltersChange(patch: StatsFilterValues) {
        void navigate({
            search: (prev) => ({ ...prev, ...patch }),
            replace: true,
        });
    }

    return (
        <div className="space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">Estadísticas</h1>
                <p className="text-sm text-muted-foreground">
                    Del {formatLocalDate(period.from)} al{' '}
                    {formatLocalDate(period.to)}
                    {period.organization
                        ? ` · ${period.organization.name}`
                        : ' · todas las organizaciones'}{' '}
                    · hora de {period.timezone}
                </p>
            </header>

            <StatsFilters
                from={period.from}
                to={period.to}
                organization={period.organization}
                onChange={handleFiltersChange}
            />

            <AppointmentRatesCards appointments={stats.appointments} />

            <AppointmentsPerDayChart perDay={stats.appointments.per_day} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <AppointmentsByStatusChart
                    byStatus={stats.appointments.by_status}
                />
                <div className="grid grid-cols-1 gap-6">
                    <AppointmentsByOriginChart
                        byOrigin={stats.appointments.by_origin}
                    />
                    <RemindersCard reminders={stats.reminders} />
                </div>
            </div>

            <PatientsCard patients={stats.patients} />
        </div>
    );
}
