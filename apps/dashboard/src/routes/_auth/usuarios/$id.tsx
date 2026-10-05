import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { subjectAuditQueryOptions } from '@/features/audit-trail/audit-logs-query';
import { SubjectAuditCard } from '@/features/audit-trail/SubjectAuditCard';
import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { UserHeader } from './-components/UserHeader';
import { UserMembershipsCard } from './-components/UserMembershipsCard';
import { userQueryOptions } from './-hooks/use-user';

export const Route = createFileRoute('/_auth/usuarios/$id')({
    params: {
        parse: (rawParams) => ({ id: Number(rawParams.id) }),
    },
    loader: async ({ context, params }) => {
        const [user, audit] = await Promise.all([
            context.queryClient.ensureQueryData(userQueryOptions(params.id)),
            context.queryClient.ensureQueryData(
                subjectAuditQueryOptions('user', params.id),
            ),
        ]);

        return { user, audit };
    },
    head: ({ loaderData }) => titleHead(loaderData?.user.name, 'Usuarios'),
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: UsuarioDetallePage,
});

function UsuarioDetallePage() {
    const { user, audit } = Route.useLoaderData();

    return (
        <div className="space-y-6">
            <UserHeader user={user} />
            <UserMembershipsCard memberships={user.memberships} />
            <SubjectAuditCard
                logs={audit}
                subjectType="user"
                subjectId={user.id}
            />
        </div>
    );
}
