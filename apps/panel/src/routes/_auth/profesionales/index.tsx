import { EmptyState } from '@/components/EmptyState';
import { QueryErrorState } from '@/components/QueryErrorState';
import { Button } from '@/components/ui/button';
import { Link, createFileRoute } from '@tanstack/react-router';
import { UserPlus } from 'lucide-react';
import { MembersTable } from './-components/MembersTable';
import { useMemberships } from './-hooks/use-memberships';

export const Route = createFileRoute('/_auth/profesionales/')({
    component: ProfesionalesPage,
});

function ProfesionalesPage() {
    const { data: memberships, isPending, isError, error } = useMemberships();

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

            {isError && <QueryErrorState error={error} />}

            {!isError && isPending && (
                <p className="text-sm text-muted-foreground">Cargando…</p>
            )}

            {!isError && !isPending && memberships && (
                <MembersTable memberships={memberships} empty={empty} />
            )}
        </div>
    );
}
