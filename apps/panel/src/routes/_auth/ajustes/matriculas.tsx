import { ListSkeleton } from '@/components/ListSkeleton';
import { Separator } from '@/components/ui/separator';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import { sessionQueryOptions } from '@/lib/session';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { AttendPatientsSection } from './-components/AttendPatientsSection';
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

        const { ownProfessionalMembership, managedOwnMembership } =
            ownMemberships(session);

        // Nothing to show to whoever neither attends here nor can start to.
        if (!ownProfessionalMembership && !managedOwnMembership) {
            throw redirect({ to: '/ajustes', replace: true });
        }

        // Only whoever attends patients here holds licenses.
        const [documentNumber, licenses] = ownProfessionalMembership
            ? await Promise.all([
                  context.queryClient.ensureQueryData(
                      professionalDocumentQueryOptions,
                  ),
                  context.queryClient.ensureQueryData(
                      professionalLicensesQueryOptions,
                  ),
              ])
            : [null, []];

        return {
            isProfessional: ownProfessionalMembership !== null,
            managedOwnMembership,
            documentNumber,
            licenses,
            organizationProvince: session.organization?.province ?? null,
        };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: MatriculasPage,
});

// Whether the user attends patients here (for whoever manages the team), and
// the professional's DNI and licenses (#380), checked against the Buscador
// Nacional de Profesionales de la Salud, which also give the specialties they
// may attend with (#387). Licenses only count here with the professional role
// (#278): turning «Atiendo pacientes» on reloads the page with them.
function MatriculasPage() {
    const {
        isProfessional,
        managedOwnMembership,
        documentNumber,
        licenses,
        organizationProvince,
    } = Route.useLoaderData();

    return (
        <div className="space-y-8">
            {managedOwnMembership && (
                <AttendPatientsSection membership={managedOwnMembership} />
            )}
            {managedOwnMembership && isProfessional && <Separator />}
            {isProfessional && (
                <>
                    <ProfessionalDocumentSection
                        documentNumber={documentNumber}
                    />
                    <Separator />
                    <ProfessionalLicensesSection
                        licenses={licenses}
                        hasDocument={documentNumber !== null}
                        organizationProvince={organizationProvince}
                    />
                </>
            )}
        </div>
    );
}
