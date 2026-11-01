import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import { sessionHasPermission, sessionQueryOptions } from '@/lib/session';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { OrganizationProvinceSection } from './-components/OrganizationProvinceSection';

export const Route = createFileRoute('/_auth/ajustes/consultorio')({
    head: () => titleHead('Consultorio', 'Ajustes'),
    loader: async ({ context }) => {
        const session =
            await context.queryClient.ensureQueryData(sessionQueryOptions);

        if (
            !session.organization ||
            !sessionHasPermission(session, 'organization.manage')
        ) {
            throw redirect({ to: '/ajustes', replace: true });
        }

        return { province: session.organization.province ?? null };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: ConsultorioPage,
});

// The practice's own data, for whoever manages it.
function ConsultorioPage() {
    const { province } = Route.useLoaderData();

    return <OrganizationProvinceSection province={province} />;
}
