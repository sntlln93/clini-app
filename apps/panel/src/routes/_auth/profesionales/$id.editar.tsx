import { createFileRoute } from '@tanstack/react-router';
import { MemberEditForm } from './-components/MemberEditForm';
import { useMemberships } from './-hooks/use-memberships';

export const Route = createFileRoute('/_auth/profesionales/$id/editar')({
    component: EditarProfesionalPage,
});

function EditarProfesionalPage() {
    const { id } = Route.useParams();
    const { data: memberships, isPending } = useMemberships();
    const membership = memberships?.find(
        (candidate) => candidate.id === Number(id),
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Editar profesional</h1>
            {isPending && (
                <p className="text-sm text-muted-foreground">Cargando…</p>
            )}
            {!isPending && !membership && (
                <p className="text-sm text-muted-foreground">
                    No se encontró la membresía.
                </p>
            )}
            {membership && <MemberEditForm membership={membership} />}
        </div>
    );
}
