import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { PlanFeatureNote } from '@/features/plan-feature-note/PlanFeatureNote';
import { ensureScopedProfessionals } from '@/hooks/use-professionals';
import { DateTime, toInstant } from '@/lib/datetime';
import { titleHead } from '@/lib/page-title';
import { planIncludes, planQueryOptions } from '@/lib/plan';
import { createFileRoute } from '@tanstack/react-router';
import { formatClockTime, todayRange } from './-components/waiting-room';
import { WaitingRoomBoard } from './-components/WaitingRoomBoard';
import {
    useWaitingRoomAutoRefresh,
    waitingRoomQueryKey,
    waitingRoomQueryOptions,
} from './-hooks/use-waiting-room';

// No search params: the date is always "today", recomputed on every (re)load.
export const Route = createFileRoute('/_auth/sala-de-espera/')({
    head: () => titleHead('Sala de espera'),
    loader: async ({ context }) => {
        // A plan without the waiting room (Free) gets an explanation instead
        // of a read the API would reject (#237).
        const plan =
            await context.queryClient.ensureQueryData(planQueryOptions);

        if (!planIncludes(plan, 'waiting_room')) {
            return { available: false as const };
        }

        const range = todayRange();
        const [professionals, appointments] = await Promise.all([
            ensureScopedProfessionals(context.queryClient),
            context.queryClient.ensureQueryData(waitingRoomQueryOptions(range)),
        ]);
        // A failed auto-refresh keeps the cached data and its timestamp, so a stale screen shows an old time.
        const updatedAt =
            context.queryClient.getQueryState(waitingRoomQueryKey(range))
                ?.dataUpdatedAt || DateTime.now().toMillis();

        return {
            available: true as const,
            professionals,
            appointments,
            updatedAt,
        };
    },
    pendingComponent: () => <ListSkeleton rows={4} />,
    errorComponent: RouteErrorState,
    component: WaitingRoomPage,
});

function WaitingRoomPage() {
    const data = Route.useLoaderData();

    if (!data.available) {
        return (
            <div className="space-y-4">
                <h1 className="text-3xl tracking-tight">Sala de espera</h1>
                <PlanFeatureNote>
                    La sala de espera en vivo es parte del plan Consultorio.
                </PlanFeatureNote>
            </div>
        );
    }

    return <WaitingRoomScreen {...data} />;
}

function WaitingRoomScreen({
    professionals,
    appointments,
    updatedAt,
}: Omit<
    Extract<ReturnType<typeof Route.useLoaderData>, { available: true }>,
    'available'
>) {
    useWaitingRoomAutoRefresh();

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl tracking-tight">Sala de espera</h1>
                <p className="text-base text-muted-foreground">
                    Pacientes que ya llegaron hoy, por profesional.
                </p>
                <p className="text-sm text-muted-foreground">
                    Actualizado a las{' '}
                    <time
                        className="tabular-nums"
                        dateTime={toInstant(DateTime.fromMillis(updatedAt))}
                    >
                        {formatClockTime(updatedAt)}
                    </time>
                </p>
            </div>

            <WaitingRoomBoard
                professionals={professionals}
                appointments={appointments}
                updatedAt={updatedAt}
            />
        </div>
    );
}
