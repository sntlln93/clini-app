import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { NoProfessionalsEmptyState } from '@/features/NoProfessionalsEmptyState';
import {
    createFileRoute,
    Outlet,
    retainSearchParams,
} from '@tanstack/react-router';
import { z } from 'zod';
import { availabilityNav } from './-components/availability-nav';
import { ProfessionalPicker } from './-components/ProfessionalPicker';
import { loadAvailabilitySelection } from './-hooks/load-availability-selection';
import { useAvailabilityPermissions } from './-hooks/use-availability-permissions';

const disponibilidadSearchSchema = z.object({
    membershipId: z.coerce.number().optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/disponibilidad')({
    staticData: { secondaryNav: availabilityNav },
    validateSearch: (search) => disponibilidadSearchSchema.parse(search),
    // The selected professional carries over between the sub-pages.
    search: { middlewares: [retainSearchParams(['membershipId'])] },
    loaderDeps: ({ search }) => ({ membershipId: search.membershipId }),
    loader: async ({ context, deps }) => {
        const { professionals, selected } = await loadAvailabilitySelection(
            context.queryClient,
            deps.membershipId,
        );

        return { professionals, selectedId: selected?.id };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: DisponibilidadLayout,
});

// Both sub-pages under one heading and one professional picker; the
// sub-pages live in the secondary navigation under the header.
function DisponibilidadLayout() {
    const navigate = Route.useNavigate();
    const { professionals, selectedId } = Route.useLoaderData();
    const { canManageOrgWide } = useAvailabilityPermissions();

    function handleSelect(membershipId: number) {
        void navigate({ search: (prev) => ({ ...prev, membershipId }) });
    }

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl tracking-tight">Disponibilidad</h1>
                <p className="text-sm text-muted-foreground">
                    Definí la semana habitual de atención y las fechas que la
                    cambian.
                </p>
            </div>

            {professionals.length === 0 ? (
                <NoProfessionalsEmptyState description="Invitá a un profesional para configurar sus horarios." />
            ) : (
                <div className="space-y-6">
                    {canManageOrgWide && (
                        <ProfessionalPicker
                            professionals={professionals}
                            selectedId={selectedId ?? null}
                            onSelect={handleSelect}
                        />
                    )}
                    <Outlet />
                </div>
            )}
        </div>
    );
}
