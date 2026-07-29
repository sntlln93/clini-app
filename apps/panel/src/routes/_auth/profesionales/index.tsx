import { EmptyState } from '@/components/EmptyState';
import { RouteErrorState } from '@/components/RouteErrorState';
import { TableSkeleton } from '@/components/TableSkeleton';
import { Button } from '@/components/ui/button';
import { Link, createFileRoute } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';
import { MembersTable } from './-components/MembersTable';
import { membershipsQueryOptions } from './-hooks/use-memberships';

export const Route = createFileRoute('/_auth/profesionales/')({
    loader: ({ context }) =>
        context.queryClient.ensureQueryData(membershipsQueryOptions()),
    pendingComponent: () => <TableSkeleton columns={5} />,
    errorComponent: RouteErrorState,
    component: ProfesionalesPage,
});

function ProfesionalesPage() {
    const memberships = Route.useLoaderData();

    const empty = (
        <EmptyState
            icon={UserPlus}
            title="Todavía no hay miembros"
            description="Invitá a un profesional para que pueda gestionar su agenda."
            action={
                <Button
                    render={<Link to="/profesionales/nuevo" />}
                    nativeButton={false}
                >
                    Invitar miembro
                </Button>
            }
        />
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">Profesionales</h1>
                <Button
                    render={<Link to="/profesionales/nuevo" />}
                    nativeButton={false}
                >
                    Invitar miembro
                </Button>
            </header>

            <MembersTable memberships={memberships} empty={empty} />
        </div>
    );
}
