import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { createFileRoute } from '@tanstack/react-router';
import { MemberEditForm } from './-components/MemberEditForm';
import { membershipQueryOptions } from './-hooks/use-memberships';

export const Route = createFileRoute('/_auth/profesionales/$id/editar')({
    params: {
        parse: (rawParams) => ({ id: Number(rawParams.id) }),
    },
    loader: ({ context, params }) =>
        context.queryClient.ensureQueryData(membershipQueryOptions(params.id)),
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: EditarProfesionalPage,
});

function EditarProfesionalPage() {
    const membership = Route.useLoaderData();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Editar profesional</h1>
            <MemberEditForm membership={membership} />
        </div>
    );
}
