import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { ensureScopedProfessionals } from '@/hooks/use-professionals';
import { titleHead } from '@/lib/page-title';
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
        const range = todayRange();
        const [professionals, appointments] = await Promise.all([
            ensureScopedProfessionals(context.queryClient),
            context.queryClient.ensureQueryData(waitingRoomQueryOptions(range)),
        ]);
        // A failed auto-refresh keeps the cached data and its timestamp, so a stale screen shows an old time.
        const updatedAt =
            context.queryClient.getQueryState(waitingRoomQueryKey(range))
                ?.dataUpdatedAt || Date.now();

        return { professionals, appointments, updatedAt };
    },
    pendingComponent: () => <ListSkeleton rows={4} />,
    errorComponent: RouteErrorState,
    component: WaitingRoomPage,
});

function WaitingRoomPage() {
    const { professionals, appointments, updatedAt } = Route.useLoaderData();
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
                        dateTime={new Date(updatedAt).toISOString()}
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
