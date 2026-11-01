import { ListSkeleton } from '@/components/ListSkeleton';
import { Separator } from '@/components/ui/separator';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import { sessionHasPermission, sessionQueryOptions } from '@/lib/session';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { MyPublicLinkSection } from './-components/MyPublicLinkSection';
import { OrganizationBookingLinkSection } from './-components/OrganizationBookingLinkSection';
import { OrganizationBookingSettings } from './-components/OrganizationBookingSettings';
import { loadOrganizationSettings } from './-hooks/load-organization-settings';
import { ownMemberships } from './-hooks/own-memberships';

export const Route = createFileRoute('/_auth/ajustes/reservas')({
    head: () => titleHead('Reservas', 'Ajustes'),
    loader: async ({ context }) => {
        const session =
            await context.queryClient.ensureQueryData(sessionQueryOptions);

        if (!session.membership) {
            throw redirect({ to: '/ajustes', replace: true });
        }

        return {
            organizationSlug: session.organization?.slug ?? null,
            ownProfessionalMembership:
                ownMemberships(session).ownProfessionalMembership,
            organizationSettings: sessionHasPermission(
                session,
                'organization.manage',
            )
                ? await loadOrganizationSettings(context.queryClient)
                : null,
        };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: ReservasPage,
});

// The practice's booking link, the professional's own, and (for whoever
// manages the practice) what the booking page shows.
function ReservasPage() {
    const {
        organizationSlug,
        ownProfessionalMembership,
        organizationSettings,
    } = Route.useLoaderData();

    return (
        <div className="space-y-8">
            {organizationSlug && (
                <OrganizationBookingLinkSection slug={organizationSlug} />
            )}
            {ownProfessionalMembership && (
                <>
                    <Separator />
                    <MyPublicLinkSection
                        membership={ownProfessionalMembership}
                    />
                </>
            )}
            {organizationSettings && (
                <OrganizationBookingSettings settings={organizationSettings} />
            )}
        </div>
    );
}
