import { ListSkeleton } from '@/components/ListSkeleton';
import { Separator } from '@/components/ui/separator';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import { sessionQueryOptions } from '@/lib/session';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { AttendPatientsSection } from './-components/AttendPatientsSection';
import { MySpecialtiesSection } from './-components/MySpecialtiesSection';
import { ownMemberships } from './-hooks/own-memberships';
import { catalogSpecialtiesQueryOptions } from './-hooks/use-catalog';
import { userSpecialtiesQueryOptions } from './-hooks/use-user-specialties';

export const Route = createFileRoute('/_auth/ajustes/especialidades')({
    head: () => titleHead('Mis especialidades', 'Ajustes'),
    loader: async ({ context }) => {
        const session =
            await context.queryClient.ensureQueryData(sessionQueryOptions);
        const { ownProfessionalMembership, managedOwnMembership } =
            ownMemberships(session);

        // Nothing to show to whoever neither attends here nor can start to.
        if (!ownProfessionalMembership && !managedOwnMembership) {
            throw redirect({ to: '/ajustes', replace: true });
        }

        const [catalogSpecialties, mySpecialties] = await Promise.all([
            context.queryClient.ensureQueryData(
                catalogSpecialtiesQueryOptions(),
            ),
            context.queryClient.ensureQueryData(
                userSpecialtiesQueryOptions(session.id),
            ),
        ]);

        return {
            userId: session.id,
            catalogSpecialties,
            mySpecialties,
            isProfessional: ownProfessionalMembership !== null,
            managedOwnMembership,
        };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: EspecialidadesPage,
});

// Whether the user attends patients here (for whoever manages the team) and
// the specialties they hold. Specialties belong to the user but only count
// here with the professional role (#278), so they show only with it: turning
// «Atiendo pacientes» on reloads the page with the section.
function EspecialidadesPage() {
    const {
        userId,
        catalogSpecialties,
        mySpecialties,
        isProfessional,
        managedOwnMembership,
    } = Route.useLoaderData();

    return (
        <div className="space-y-8">
            {managedOwnMembership && (
                <AttendPatientsSection membership={managedOwnMembership} />
            )}
            {managedOwnMembership && isProfessional && <Separator />}
            {isProfessional && (
                <MySpecialtiesSection
                    userId={userId}
                    specialties={catalogSpecialties}
                    mySpecialties={mySpecialties}
                />
            )}
        </div>
    );
}
