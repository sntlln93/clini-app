import { ListSkeleton } from '@/components/ListSkeleton';
import { Separator } from '@/components/ui/separator';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { professionalsQueryOptions } from '@/hooks/use-professionals';
import { titleHead } from '@/lib/page-title';
import { sessionHasPermission, sessionQueryOptions } from '@/lib/session';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { ProfessionalServicesSection } from './-components/ProfessionalServicesSection';
import { ProfessionalSpecialtiesSection } from './-components/ProfessionalSpecialtiesSection';
import { loadProfessionalAssignments } from './-hooks/load-professional-assignments';
import { catalogServicesQueryOptions } from './-hooks/use-catalog';

export const Route = createFileRoute('/_auth/ajustes/profesionales')({
    head: () => titleHead('Profesionales', 'Ajustes'),
    loader: async ({ context }) => {
        const session =
            await context.queryClient.ensureQueryData(sessionQueryOptions);

        // /memberships is admin-only (memberships.view).
        if (!sessionHasPermission(session, 'memberships.view')) {
            throw redirect({ to: '/ajustes', replace: true });
        }

        const [professionals, catalogServices] = await Promise.all([
            context.queryClient.ensureQueryData(professionalsQueryOptions()),
            context.queryClient.ensureQueryData(catalogServicesQueryOptions()),
        ]);

        return {
            professionals,
            catalogServices,
            ...(await loadProfessionalAssignments(
                context.queryClient,
                professionals,
            )),
        };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: ProfesionalesPage,
});

// The specialties and services each professional of the practice offers.
function ProfesionalesPage() {
    const {
        professionals,
        catalogServices,
        backedByMembership,
        assignedSpecialtiesByMembership,
        assignedServicesByMembership,
    } = Route.useLoaderData();

    return (
        <div className="space-y-8">
            <ProfessionalSpecialtiesSection
                professionals={professionals}
                backedByMembership={backedByMembership}
                assignedByMembership={assignedSpecialtiesByMembership}
            />
            <Separator />
            <ProfessionalServicesSection
                professionals={professionals}
                services={catalogServices}
                assignedByMembership={assignedServicesByMembership}
            />
        </div>
    );
}
