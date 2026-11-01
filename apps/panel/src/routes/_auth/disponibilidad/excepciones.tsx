import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import type { AvailabilityException } from '@/types/availability';
import { createFileRoute } from '@tanstack/react-router';
import { AvailabilityExceptionsSection } from './-components/AvailabilityExceptionsSection';
import { loadAvailabilitySelection } from './-hooks/load-availability-selection';
import { availabilityExceptionsQueryOptions } from './-hooks/use-availability-exceptions';
import { useAvailabilityPermissions } from './-hooks/use-availability-permissions';

export const Route = createFileRoute('/_auth/disponibilidad/excepciones')({
    head: () => titleHead('Excepciones', 'Disponibilidad'),
    loaderDeps: ({ search }) => ({ membershipId: search.membershipId }),
    loader: async ({ context, deps }) => {
        const { selected } = await loadAvailabilitySelection(
            context.queryClient,
            deps.membershipId,
        );
        const exceptions: AvailabilityException[] = selected
            ? await context.queryClient.ensureQueryData(
                  availabilityExceptionsQueryOptions(selected.id),
              )
            : [];

        return { selected, exceptions };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: ExcepcionesPage,
});

function ExcepcionesPage() {
    const { selected, exceptions } = Route.useLoaderData();
    const { canManageOrgWide, canWriteOrgWide, canManage, readOnlyReason } =
        useAvailabilityPermissions();

    if (!selected) {
        return null;
    }

    return (
        <AvailabilityExceptionsSection
            key={selected.id}
            membershipId={selected.id}
            heading={
                canManageOrgWide
                    ? `Excepciones de ${selected.user.name ?? selected.user.email}`
                    : 'Tus excepciones'
            }
            canManageOwn={canManage(selected)}
            canManageOrgWide={canWriteOrgWide}
            readOnlyReason={readOnlyReason(selected)}
            exceptions={exceptions}
        />
    );
}
