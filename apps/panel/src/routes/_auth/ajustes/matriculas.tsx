import { ListSkeleton } from '@/components/ListSkeleton';
import { Separator } from '@/components/ui/separator';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import { sessionQueryOptions } from '@/lib/session';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { ProfessionalDocumentSection } from './-components/ProfessionalDocumentSection';
import { ProfessionalLicensesSection } from './-components/ProfessionalLicensesSection';
import { ownMemberships } from './-hooks/own-memberships';
import {
    professionalDocumentQueryOptions,
    professionalLicensesQueryOptions,
} from './-hooks/use-professional-licenses';

export const Route = createFileRoute('/_auth/ajustes/matriculas')({
    head: () => titleHead('Matrículas', 'Ajustes'),
    loader: async ({ context }) => {
        const session =
            await context.queryClient.ensureQueryData(sessionQueryOptions);

        // Only whoever attends patients here holds licenses.
        if (!ownMemberships(session).ownProfessionalMembership) {
            throw redirect({ to: '/ajustes', replace: true });
        }

        const [documentNumber, licenses] = await Promise.all([
            context.queryClient.ensureQueryData(
                professionalDocumentQueryOptions,
            ),
            context.queryClient.ensureQueryData(
                professionalLicensesQueryOptions,
            ),
        ]);

        return {
            documentNumber,
            licenses,
            organizationProvince: session.organization?.province ?? null,
        };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: MatriculasPage,
});

// The professional's DNI and licenses (#380), checked against the Buscador
// Nacional de Profesionales de la Salud.
function MatriculasPage() {
    const { documentNumber, licenses, organizationProvince } =
        Route.useLoaderData();

    return (
        <div className="space-y-8">
            <ProfessionalDocumentSection documentNumber={documentNumber} />
            <Separator />
            <ProfessionalLicensesSection
                licenses={licenses}
                hasDocument={documentNumber !== null}
                organizationProvince={organizationProvince}
            />
        </div>
    );
}
