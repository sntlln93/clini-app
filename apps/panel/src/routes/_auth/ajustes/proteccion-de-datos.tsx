import { ListSkeleton } from '@/components/ListSkeleton';
import { Separator } from '@/components/ui/separator';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import { sessionQueryOptions } from '@/lib/session';
import { createFileRoute } from '@tanstack/react-router';
import { ClinicalRecordExportSection } from './-components/ClinicalRecordExportSection';
import { DeleteAccountSection } from './-components/DeleteAccountSection';
import { ExceptionalAccessesSection } from './-components/ExceptionalAccessesSection';
import { ownMemberships } from './-hooks/own-memberships';

export const Route = createFileRoute('/_auth/ajustes/proteccion-de-datos')({
    head: () => titleHead('Protección de datos', 'Ajustes'),
    loader: async ({ context }) => {
        const session =
            await context.queryClient.ensureQueryData(sessionQueryOptions);

        return {
            isProfessional:
                ownMemberships(session).ownProfessionalMembership !== null,
            isOwner: (session.roles ?? []).includes('owner'),
            twoFactorEnabled: session.two_factor_enabled,
        };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: ProteccionDeDatosPage,
});

// The professional's export of the history, the owner's audit of exceptional
// accesses, and the account's deletion.
function ProteccionDeDatosPage() {
    const { isProfessional, isOwner, twoFactorEnabled } = Route.useLoaderData();

    return (
        <div className="space-y-8">
            {isProfessional && (
                <>
                    <ClinicalRecordExportSection />
                    <Separator />
                </>
            )}
            {isOwner && (
                <>
                    <ExceptionalAccessesSection />
                    <Separator />
                </>
            )}
            <DeleteAccountSection twoFactorEnabled={twoFactorEnabled} />
        </div>
    );
}
