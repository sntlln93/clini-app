import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import type { Availability } from '@/types/availability';
import { createFileRoute } from '@tanstack/react-router';
import { WeeklySchedule } from './-components/WeeklySchedule';
import { loadAvailabilitySelection } from './-hooks/load-availability-selection';
import { availabilitiesQueryOptions } from './-hooks/use-availabilities';
import { useAvailabilityPermissions } from './-hooks/use-availability-permissions';

export const Route = createFileRoute('/_auth/disponibilidad/')({
    head: () => titleHead('Semana habitual', 'Disponibilidad'),
    loaderDeps: ({ search }) => ({ membershipId: search.membershipId }),
    loader: async ({ context, deps }) => {
        const { selected } = await loadAvailabilitySelection(
            context.queryClient,
            deps.membershipId,
        );
        const slots: Availability[] = selected
            ? await context.queryClient.ensureQueryData(
                  availabilitiesQueryOptions(selected.id),
              )
            : [];

        return { selected, slots };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: SemanaHabitualPage,
});

function SemanaHabitualPage() {
    const { selected, slots } = Route.useLoaderData();
    const { canManageOrgWide, canManage, readOnlyReason } =
        useAvailabilityPermissions();

    if (!selected) {
        return null;
    }

    return (
        <WeeklySchedule
            // A new professional starts a fresh draft.
            key={selected.id}
            membershipId={selected.id}
            heading={
                canManageOrgWide
                    ? `Semana de ${selected.user.name ?? selected.user.email}`
                    : 'Tu semana habitual'
            }
            canManage={canManage(selected)}
            readOnlyReason={readOnlyReason(selected)}
            slots={slots}
        />
    );
}
