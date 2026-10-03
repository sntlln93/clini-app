import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { ensureScopedProfessionals } from '@/hooks/use-professionals';
import { createFileRoute } from '@tanstack/react-router';
import { todayRange } from './-components/waiting-room';
import { WaitingRoomBoard } from './-components/WaitingRoomBoard';
import {
    useWaitingRoomAutoRefresh,
    waitingRoomQueryOptions,
} from './-hooks/use-waiting-room';

// No search params: the date is always "today", recomputed on every (re)load.
export const Route = createFileRoute('/_auth/sala-de-espera/')({
    loader: async ({ context }) => {
        const [professionals, appointments] = await Promise.all([
            ensureScopedProfessionals(context.queryClient),
            context.queryClient.ensureQueryData(
                waitingRoomQueryOptions(todayRange()),
            ),
        ]);

        return { professionals, appointments };
    },
    pendingComponent: () => <ListSkeleton rows={4} />,
    errorComponent: RouteErrorState,
    component: WaitingRoomPage,
});

function WaitingRoomPage() {
    const { professionals, appointments } = Route.useLoaderData();
    useWaitingRoomAutoRefresh();

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-semibold">Sala de espera</h1>
                <p className="text-base text-muted-foreground">
                    Pacientes que ya llegaron hoy, por profesional.
                </p>
            </div>

            <WaitingRoomBoard
                professionals={professionals}
                appointments={appointments}
            />
        </div>
    );
}
