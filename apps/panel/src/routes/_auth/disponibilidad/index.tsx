import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { ensureScopedProfessionals } from '@/hooks/use-professionals';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
import type { Membership } from '@/types/membership';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AvailabilityExceptionsSection } from './-components/AvailabilityExceptionsSection';
import { ProfessionalPicker } from './-components/ProfessionalPicker';
import { WeeklyAvailabilitySection } from './-components/WeeklyAvailabilitySection';
import { availabilitiesQueryOptions } from './-hooks/use-availabilities';
import { availabilityExceptionsQueryOptions } from './-hooks/use-availability-exceptions';
import { useAvailabilityPermissions } from './-hooks/use-availability-permissions';

const disponibilidadSearchSchema = z.object({
    membershipId: z.coerce.number().optional(),
});

/** Duplicates `useAvailabilityPermissions`' own-vs-org-wide rule because loaders run outside React and can't use the hook directly. */
function defaultMembershipId(
    professionals: Membership[],
    session: SessionUser | undefined,
): number | undefined {
    if (professionals.length === 0) {
        return undefined;
    }

    const permissions = session?.permissions ?? [];
    if (permissions.includes('availability.manage')) {
        return professionals[0].id;
    }

    const ownMembership = professionals.find(
        (membership) => membership.user.id === session?.id,
    );

    return ownMembership?.id ?? professionals[0].id;
}

export const Route = createFileRoute('/_auth/disponibilidad/')({
    validateSearch: (search) => disponibilidadSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({ membershipId: search.membershipId }),
    loader: async ({ context, deps }) => {
        const [session, professionals] = await Promise.all([
            context.queryClient.ensureQueryData(sessionQueryOptions),
            ensureScopedProfessionals(context.queryClient),
        ]);

        const selectedId =
            deps.membershipId !== undefined &&
            professionals.some(
                (membership) => membership.id === deps.membershipId,
            )
                ? deps.membershipId
                : defaultMembershipId(professionals, session);

        const [slots, exceptions] =
            selectedId === undefined
                ? [[], []]
                : await Promise.all([
                      context.queryClient.ensureQueryData(
                          availabilitiesQueryOptions(selectedId),
                      ),
                      context.queryClient.ensureQueryData(
                          availabilityExceptionsQueryOptions(selectedId),
                      ),
                  ]);

        return { professionals, selectedId, slots, exceptions };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: DisponibilidadPage,
});

function DisponibilidadPage() {
    const navigate = Route.useNavigate();
    const { professionals, selectedId, slots, exceptions } =
        Route.useLoaderData();
    const { canManageOrgWide, canManage } = useAvailabilityPermissions();

    const selectedMembership = professionals.find(
        (membership) => membership.id === selectedId,
    );

    function handleSelect(membershipId: number) {
        void navigate({ search: (prev) => ({ ...prev, membershipId }) });
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold">Disponibilidad</h1>
                <p className="text-sm text-muted-foreground">
                    Configurá los horarios de atención y las excepciones de cada
                    profesional.
                </p>
            </div>

            {professionals.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay profesionales en esta organización.
                </p>
            )}

            {professionals.length > 0 && (
                <div className="space-y-6">
                    {canManageOrgWide && (
                        <ProfessionalPicker
                            professionals={professionals}
                            selectedId={selectedId ?? null}
                            onSelect={handleSelect}
                        />
                    )}

                    {selectedMembership && (
                        <>
                            <WeeklyAvailabilitySection
                                membershipId={selectedMembership.id}
                                canManage={canManage(selectedMembership)}
                                slots={slots}
                            />
                            <AvailabilityExceptionsSection
                                membershipId={selectedMembership.id}
                                canManageOwn={canManage(selectedMembership)}
                                canManageOrgWide={canManageOrgWide}
                                exceptions={exceptions}
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
