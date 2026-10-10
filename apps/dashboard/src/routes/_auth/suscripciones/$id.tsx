import { DataTablePagination } from '@/components/DataTablePagination';
import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subjectAuditQueryOptions } from '@/features/audit-trail/audit-logs-query';
import { SubjectAuditCard } from '@/features/audit-trail/SubjectAuditCard';
import { OrganizationStateBadge } from '@/features/status-badges/OrganizationStateBadge';
import { SubscriptionEventsTable } from '@/features/subscription-events/SubscriptionEventsTable';
import { titleHead } from '@/lib/page-title';
import { Link, createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ExtendGraceDialog } from './-components/ExtendGraceDialog';
import { SubscriptionSummaryCard } from './-components/SubscriptionSummaryCard';
import { subscriptionQueryOptions } from './-hooks/use-subscription';
import { subscriptionDetailEventsQueryOptions } from './-hooks/use-subscription-events';

const subscriptionSearchSchema = z.object({
    events_page: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/suscripciones/$id')({
    params: {
        parse: (rawParams) => ({ id: Number(rawParams.id) }),
    },
    validateSearch: (search) => subscriptionSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({ eventsPage: search.events_page ?? 1 }),
    loader: async ({ context, params, deps }) => {
        // The detail first: for an unknown id its 404 is the error shown, never the events filter's 422 (`exists:`).
        const subscription = await context.queryClient.ensureQueryData(
            subscriptionQueryOptions(params.id),
        );
        const [events, audit] = await Promise.all([
            context.queryClient.ensureQueryData(
                subscriptionDetailEventsQueryOptions(
                    params.id,
                    deps.eventsPage,
                ),
            ),
            context.queryClient.ensureQueryData(
                subjectAuditQueryOptions('subscription', params.id),
            ),
        ]);

        return { subscription, events, audit };
    },
    head: ({ loaderData }) =>
        titleHead(loaderData?.subscription.organization.name, 'Suscripciones'),
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: SuscripcionDetallePage,
});

function SuscripcionDetallePage() {
    const { subscription, events, audit } = Route.useLoaderData();
    const navigate = Route.useNavigate();
    const { organization } = subscription;
    const canExtend =
        subscription.status === 'grace' || subscription.status === 'expired';

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl tracking-tight wrap-break-word">
                            Suscripción de {organization.name}
                        </h1>
                        <OrganizationStateBadge
                            suspendedAt={organization.suspended_at}
                        />
                    </div>
                    <Button
                        variant="link"
                        className="h-auto p-0"
                        render={
                            <Link
                                to="/organizaciones/$id"
                                params={{ id: organization.id }}
                            />
                        }
                        nativeButton={false}
                    >
                        Ver organización
                    </Button>
                </div>
                {canExtend && <ExtendGraceDialog subscription={subscription} />}
            </header>
            <SubscriptionSummaryCard subscription={subscription} />
            <Card className="min-w-0">
                <CardHeader>
                    <CardTitle>Eventos del proveedor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <SubscriptionEventsTable events={events.data} />
                    <DataTablePagination
                        currentPage={events.meta.current_page}
                        lastPage={events.meta.last_page}
                        total={events.meta.total}
                        label="eventos"
                        onPageChange={(page) =>
                            void navigate({
                                search: { events_page: page },
                                resetScroll: false,
                            })
                        }
                    />
                </CardContent>
            </Card>
            <SubjectAuditCard
                logs={audit}
                subjectType="subscription"
                subjectId={subscription.id}
            />
        </div>
    );
}
