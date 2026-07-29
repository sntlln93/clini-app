import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { Separator } from '@/components/ui/separator';
import { professionalsQueryOptions } from '@/hooks/use-professionals';
import { sessionQueryOptions } from '@/lib/session';
import type {
    ProfessionalService,
    ProfessionalSpecialty,
    UserSpecialty,
} from '@/types/professional';
import { createFileRoute } from '@tanstack/react-router';
import { MySpecialtiesSection } from './-components/MySpecialtiesSection';
import { ProfessionalServicesSection } from './-components/ProfessionalServicesSection';
import { ProfessionalSpecialtiesSection } from './-components/ProfessionalSpecialtiesSection';
import { ThemeToggle } from './-components/ThemeToggle';
import {
    catalogServicesQueryOptions,
    catalogSpecialtiesQueryOptions,
} from './-hooks/use-catalog';
import { professionalServicesQueryOptions } from './-hooks/use-professional-services';
import { professionalSpecialtiesQueryOptions } from './-hooks/use-professional-specialties';
import { userSpecialtiesQueryOptions } from './-hooks/use-user-specialties';

export const Route = createFileRoute('/_auth/ajustes/')({
    loader: async ({ context }) => {
        const [session, professionals, catalogSpecialties, catalogServices] =
            await Promise.all([
                context.queryClient.ensureQueryData(sessionQueryOptions),
                context.queryClient.ensureQueryData(
                    professionalsQueryOptions(),
                ),
                context.queryClient.ensureQueryData(
                    catalogSpecialtiesQueryOptions(),
                ),
                context.queryClient.ensureQueryData(
                    catalogServicesQueryOptions(),
                ),
            ]);

        const mySpecialties = await context.queryClient.ensureQueryData(
            userSpecialtiesQueryOptions(session.id),
        );

        const perMembershipSpecialties = await Promise.all(
            professionals.map((membership) =>
                Promise.all([
                    context.queryClient.ensureQueryData(
                        userSpecialtiesQueryOptions(membership.user.id),
                    ),
                    context.queryClient.ensureQueryData(
                        professionalSpecialtiesQueryOptions(membership.id),
                    ),
                ]),
            ),
        );

        const perMembershipServices = await Promise.all(
            professionals.map((membership) =>
                context.queryClient.ensureQueryData(
                    professionalServicesQueryOptions(membership.id),
                ),
            ),
        );

        const credentialsByMembership: Record<number, UserSpecialty[]> = {};
        const assignedSpecialtiesByMembership: Record<
            number,
            ProfessionalSpecialty[]
        > = {};
        const assignedServicesByMembership: Record<
            number,
            ProfessionalService[]
        > = {};

        professionals.forEach((membership, index) => {
            const [credentials, assignedSpecialties] =
                perMembershipSpecialties[index];
            credentialsByMembership[membership.user.id] = credentials;
            assignedSpecialtiesByMembership[membership.id] =
                assignedSpecialties;
            assignedServicesByMembership[membership.id] =
                perMembershipServices[index];
        });

        return {
            userId: session.id,
            catalogSpecialties,
            catalogServices,
            mySpecialties,
            professionals,
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
        catalogSpecialties,
        catalogServices,
        mySpecialties,
        professionals,
        credentialsByMembership,
        assignedSpecialtiesByMembership,
        assignedServicesByMembership,
    } = Route.useLoaderData();

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold">Ajustes</h1>
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

            <Separator />

            <MySpecialtiesSection
                userId={userId}
                specialties={catalogSpecialties}
                mySpecialties={mySpecialties}
            />

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
        </div>
    );
}
