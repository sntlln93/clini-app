import { DataTablePagination } from '@/components/DataTablePagination';
import { EmptyState } from '@/components/EmptyState';
import { RouteErrorState } from '@/components/RouteErrorState';
import { TableSkeleton } from '@/components/TableSkeleton';
import { Button } from '@/components/ui/button';
import { SEARCH_DEBOUNCE_MS } from '@/features/Searchbar';
import { titleHead } from '@/lib/page-title';
import { SUBSCRIPTION_STATUSES } from '@/types/subscription';
import { createFileRoute } from '@tanstack/react-router';
import { CreditCard, SearchX } from 'lucide-react';
import { z } from 'zod';
import {
    SubscriptionFilters,
    type SubscriptionFilterValues,
} from './-components/SubscriptionFilters';
import { SubscriptionsTable } from './-components/SubscriptionsTable';
import { subscriptionsQueryOptions } from './-hooks/use-subscriptions';

const subscriptionsSearchSchema = z.object({
    q: z.string().optional().catch(undefined),
    status: z.enum(SUBSCRIPTION_STATUSES).optional().catch(undefined),
    grace_within: z.number().int().min(1).max(30).optional().catch(undefined),
    page: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/suscripciones/')({
    head: () => titleHead('Suscripciones'),
    validateSearch: (search) => subscriptionsSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({
        q: search.q ?? '',
        status: search.status,
        graceWithin: search.grace_within,
        page: search.page ?? 1,
    }),
    loader: ({ context, deps }) =>
        context.queryClient.ensureQueryData(subscriptionsQueryOptions(deps)),
    pendingMs: SEARCH_DEBOUNCE_MS,
    pendingComponent: () => <TableSkeleton columns={5} />,
    errorComponent: RouteErrorState,
    component: SuscripcionesPage,
});

function SuscripcionesPage() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const data = Route.useLoaderData();

    const filters: SubscriptionFilterValues = {
        q: search.q ?? '',
        status: search.status,
        graceWithin: search.grace_within,
    };
    const isFiltered =
        filters.q !== '' ||
        filters.status !== undefined ||
        filters.graceWithin !== undefined;

    function handleFiltersChange(patch: Partial<SubscriptionFilterValues>) {
        const next = { ...filters, ...patch };
        void navigate({
            search: {
                q: next.q || undefined,
                status: next.status,
                grace_within: next.graceWithin,
                page: undefined,
            },
            replace: true,
        });
    }

    const empty = isFiltered ? (
        <EmptyState
            icon={SearchX}
            title="Sin resultados"
            description="No hay suscripciones que coincidan con los filtros."
            action={
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => void navigate({ search: {}, replace: true })}
                >
                    Limpiar filtros
                </Button>
            }
        />
    ) : (
        <EmptyState
            icon={CreditCard}
            title="Todavía no hay suscripciones"
            description="Aparecen acá cuando una organización inicia el pago desde el panel."
        />
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Suscripciones</h1>
            <SubscriptionFilters
                values={filters}
                onChange={handleFiltersChange}
            />
            <SubscriptionsTable subscriptions={data.data} empty={empty} />
            <DataTablePagination
                currentPage={data.meta.current_page}
                lastPage={data.meta.last_page}
                total={data.meta.total}
                label="suscripciones"
                onPageChange={(page) =>
                    void navigate({ search: (prev) => ({ ...prev, page }) })
                }
            />
        </div>
    );
}
