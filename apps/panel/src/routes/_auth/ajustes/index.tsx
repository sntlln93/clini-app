import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { Separator } from '@/components/ui/separator';
import { professionalsQueryOptions } from '@/hooks/use-professionals';
import { titleHead } from '@/lib/page-title';
import { sessionHasPermission, sessionQueryOptions } from '@/lib/session';
import { subscriptionQueryOptions, useSubscription } from '@/lib/subscription';
import type {
    ProfessionalService,
    ProfessionalSpecialty,
    UserSpecialty,
} from '@/types/professional';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { MyPublicLinkSection } from './-components/MyPublicLinkSection';
import { MySpecialtiesSection } from './-components/MySpecialtiesSection';
import { ProfessionalServicesSection } from './-components/ProfessionalServicesSection';
import { ProfessionalSpecialtiesSection } from './-components/ProfessionalSpecialtiesSection';
import { SubscriptionSection } from './-components/SubscriptionSection';
import { ThemeToggle } from './-components/ThemeToggle';
import {
    catalogServicesQueryOptions,
    catalogSpecialtiesQueryOptions,
} from './-hooks/use-catalog';
import { useCheckoutReturn } from './-hooks/use-checkout-return';
import { professionalServicesQueryOptions } from './-hooks/use-professional-services';
import { professionalSpecialtiesQueryOptions } from './-hooks/use-professional-specialties';
import { userSpecialtiesQueryOptions } from './-hooks/use-user-specialties';

// `retorno`: the browser is back from the Mercado Pago checkout (the API's
// return route). Any other value is dropped rather than failing the page.
const ajustesSearchSchema = z.object({
    suscripcion: z.literal('retorno').optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/ajustes/')({
    head: () => titleHead('Ajustes'),
    validateSearch: (search) => ajustesSearchSchema.parse(search),
    loader: async ({ context }) => {
        const [session, catalogSpecialties, catalogServices] =
            await Promise.all([
                context.queryClient.ensureQueryData(sessionQueryOptions),
                context.queryClient.ensureQueryData(
                    catalogSpecialtiesQueryOptions(),
                ),
                context.queryClient.ensureQueryData(
                    catalogServicesQueryOptions(),
                ),
            ]);

        // /memberships is admin-only (memberships.view); without it, a caller
        // only manages their own specialties/link, never the org-wide catalog.
        const canManageProfessionals = sessionHasPermission(
            session,
            'memberships.view',
        );

        const professionals = canManageProfessionals
            ? await context.queryClient.ensureQueryData(
                  professionalsQueryOptions(),
              )
            : [];

        const mySpecialties = await context.queryClient.ensureQueryData(
            userSpecialtiesQueryOptions(session.id),
        );

        // No active membership means no organization to bill.
        const subscription = session.membership
            ? await context.queryClient.ensureQueryData({
                  ...subscriptionQueryOptions,
                  revalidateIfStale: true,
              })
            : null;

        const credentialsByMembership: Record<number, UserSpecialty[]> = {};
        const assignedSpecialtiesByMembership: Record<
            number,
            ProfessionalSpecialty[]
        > = {};
        const assignedServicesByMembership: Record<
            number,
            ProfessionalService[]
        > = {};

        if (canManageProfessionals) {
            const [perMembershipSpecialties, perMembershipServices] =
                await Promise.all([
                    Promise.all(
                        professionals.map((membership) =>
                            Promise.all([
                                context.queryClient.ensureQueryData(
                                    userSpecialtiesQueryOptions(
                                        membership.user.id,
                                    ),
                                ),
                                context.queryClient.ensureQueryData(
                                    professionalSpecialtiesQueryOptions(
                                        membership.id,
                                    ),
                                ),
                            ]),
                        ),
                    ),
                    Promise.all(
                        professionals.map((membership) =>
                            context.queryClient.ensureQueryData(
                                professionalServicesQueryOptions(membership.id),
                            ),
                        ),
                    ),
                ]);

            professionals.forEach((membership, index) => {
                const [credentials, assignedSpecialties] =
                    perMembershipSpecialties[index];
                credentialsByMembership[membership.user.id] = credentials;
                assignedSpecialtiesByMembership[membership.id] =
                    assignedSpecialties;
                assignedServicesByMembership[membership.id] =
                    perMembershipServices[index];
            });
        }

        return {
            userId: session.id,
            hasOrganization: Boolean(session.membership),
            subscription,
            isOwner: (session.roles ?? []).includes('owner'),
            canManageProfessionals,
            catalogSpecialties,
            catalogServices,
            mySpecialties,
            professionals,
            ownMembership: session.membership ?? null,
            credentialsByMembership,
            assignedSpecialtiesByMembership,
            assignedServicesByMembership,
        };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: AjustesPage,
});

function AjustesPage() {
    const {
        userId,
        hasOrganization,
        subscription: loaderSubscription,
        isOwner,
        canManageProfessionals,
        catalogSpecialties,
        catalogServices,
        mySpecialties,
        professionals,
        ownMembership,
        credentialsByMembership,
        assignedSpecialtiesByMembership,
        assignedServicesByMembership,
    } = Route.useLoaderData();
    // The loader may resolve with a stale cached value while it revalidates
    // in the background; observing the cache keeps this section in sync with
    // the banner once that refetch lands.
    const liveSubscription = useSubscription();
    const subscription =
        liveSubscription !== undefined ? liveSubscription : loaderSubscription;
    const { suscripcion } = Route.useSearch();
    const confirmingPayment = useCheckoutReturn(
        suscripcion === 'retorno',
        subscription?.status === 'pending',
    );

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <header className="space-y-1">
                <h1 className="text-2xl tracking-tight">Ajustes</h1>
                <p className="text-sm text-muted-foreground">
                    Personalizá la apariencia del panel y las asignaciones del
                    consultorio.
                </p>
            </header>

            <section className="space-y-3">
                <div className="space-y-1">
                    <h2 className="text-sm font-medium">Tema</h2>
                    <p className="text-sm text-muted-foreground">
                        Elegí cómo se ve el panel. «Sistema» sigue la
                        preferencia de tu dispositivo.
                    </p>
                </div>
                <ThemeToggle />
            </section>

            {hasOrganization && (
                <>
                    <Separator />
                    <SubscriptionSection
                        subscription={subscription}
                        isOwner={isOwner}
                        confirmingPayment={confirmingPayment}
                    />
                </>
            )}

            <Separator />

            <MySpecialtiesSection
                userId={userId}
                specialties={catalogSpecialties}
                mySpecialties={mySpecialties}
            />

            {ownMembership && (
                <>
                    <Separator />
                    <MyPublicLinkSection membership={ownMembership} />
                </>
            )}

            {canManageProfessionals && (
                <>
                    <Separator />

                    <ProfessionalSpecialtiesSection
                        professionals={professionals}
                        credentialsByMembership={credentialsByMembership}
                        assignedByMembership={assignedSpecialtiesByMembership}
                    />

                    <Separator />

                    <ProfessionalServicesSection
                        professionals={professionals}
                        services={catalogServices}
                        assignedByMembership={assignedServicesByMembership}
                    />
                </>
            )}
        </div>
    );
}
