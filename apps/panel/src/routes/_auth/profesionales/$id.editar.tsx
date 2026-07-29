import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { createFileRoute } from '@tanstack/react-router';
import { MemberEditForm } from './-components/MemberEditForm';
import { membershipsQueryOptions } from './-hooks/use-memberships';

export const Route = createFileRoute('/_auth/profesionales/$id/editar')({
    params: {
        parse: (rawParams) => ({ id: Number(rawParams.id) }),
    },
    loader: ({ context }) =>
        context.queryClient.ensureQueryData(membershipsQueryOptions()),
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: EditarProfesionalPage,
});

function EditarProfesionalPage() {
    const { id } = Route.useParams();
    const memberships = Route.useLoaderData();
    const membership = memberships.find((candidate) => candidate.id === id);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Editar profesional</h1>
            {!membership && (
                <p className="text-sm text-muted-foreground">
                    No se encontró la membresía.
                </p>
            )}
            {membership && <MemberEditForm membership={membership} />}
        </div>
    );
}
