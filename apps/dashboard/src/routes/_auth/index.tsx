import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import type { OverviewPeriod } from '@/types/overview';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AppointmentsCreatedChart } from './-components/AppointmentsCreatedChart';
import { KpiGrid } from './-components/KpiGrid';
import { PeriodSelect } from './-components/PeriodSelect';
import { RecentActivityList } from './-components/RecentActivityList';
import { SignupsChart } from './-components/SignupsChart';
import { overviewQueryOptions } from './-hooks/use-overview';

const DEFAULT_DAYS: OverviewPeriod = 30;

const overviewSearchSchema = z.object({
    days: z
        .union([z.literal(7), z.literal(30), z.literal(90)])
        .optional()
        .catch(undefined),
});

export const Route = createFileRoute('/_auth/')({
    head: () => titleHead('Resumen'),
    validateSearch: (search) => overviewSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({ days: search.days ?? DEFAULT_DAYS }),
    loader: ({ context, deps }) =>
        context.queryClient.ensureQueryData(overviewQueryOptions(deps)),
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: ResumenPage,
});

function ResumenPage() {
    const overview = Route.useLoaderData();
    const { days = DEFAULT_DAYS } = Route.useSearch();
    const navigate = Route.useNavigate();

    function handlePeriodChange(next: OverviewPeriod) {
        void navigate({
            search: { days: next === DEFAULT_DAYS ? undefined : next },
        });
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-semibold">Resumen</h1>
                    <p className="text-sm text-muted-foreground">
                        Estado de la plataforma. Fechas en hora de{' '}
                        {overview.series.timezone}.
                    </p>
                </div>
                <PeriodSelect value={days} onChange={handlePeriodChange} />
            </header>

            <KpiGrid kpis={overview.kpis} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <SignupsChart points={overview.series.points} />
                <AppointmentsCreatedChart points={overview.series.points} />
            </div>

            <RecentActivityList activity={overview.recent_activity} />
        </div>
    );
}
