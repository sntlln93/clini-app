import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subjectAuditQueryOptions } from '@/features/audit-trail/audit-logs-query';
import { SubjectAuditCard } from '@/features/audit-trail/SubjectAuditCard';
import { subscriptionEventsQueryOptions } from '@/features/subscription-events/subscription-events-query';
import { SubscriptionEventsTable } from '@/features/subscription-events/SubscriptionEventsTable';
import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { OrganizationHeader } from './-components/OrganizationHeader';
import { OrganizationMembersCard } from './-components/OrganizationMembersCard';
import { OrganizationSubscriptionCard } from './-components/OrganizationSubscriptionCard';
import { OrganizationUsageCard } from './-components/OrganizationUsageCard';
import { organizationQueryOptions } from './-hooks/use-organization';

export const Route = createFileRoute('/_auth/organizaciones/$id')({
    params: {
        parse: (rawParams) => ({ id: Number(rawParams.id) }),
    },
    loader: async ({ context, params }) => {
        // The detail first: for an unknown id its 404 is the error shown, never the events filter's 422 (`exists:`).
        const organization = await context.queryClient.ensureQueryData(
            organizationQueryOptions(params.id),
        );
        const [audit, events] = await Promise.all([
            context.queryClient.ensureQueryData(
                subjectAuditQueryOptions('organization', params.id),
            ),
            context.queryClient.ensureQueryData(
                subscriptionEventsQueryOptions({
                    organization_id: params.id,
                    per_page: 10,
                }),
            ),
        ]);

        return { organization, audit, events };
    },
    head: ({ loaderData }) =>
        titleHead(loaderData?.organization.name, 'Organizaciones'),
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: OrganizacionDetallePage,
});

function OrganizacionDetallePage() {
    const { organization, audit, events } = Route.useLoaderData();

    return (
        <div className="space-y-6">
            <OrganizationHeader organization={organization} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <OrganizationUsageCard usage={organization.usage} />
                <OrganizationSubscriptionCard
                    subscription={organization.subscription}
                />
            </div>
            <OrganizationMembersCard members={organization.members} />
            <Card className="min-w-0">
                <CardHeader>
                    <CardTitle>Eventos del proveedor</CardTitle>
                </CardHeader>
                <CardContent>
                    <SubscriptionEventsTable events={events.data} />
                </CardContent>
            </Card>
            <SubjectAuditCard
                logs={audit}
                subjectType="organization"
                subjectId={organization.id}
            />
        </div>
    );
}
