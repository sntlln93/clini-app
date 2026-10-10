import { DataTablePagination } from '@/components/DataTablePagination';
import { EmptyState } from '@/components/EmptyState';
import { RouteErrorState } from '@/components/RouteErrorState';
import { TableSkeleton } from '@/components/TableSkeleton';
import { Button } from '@/components/ui/button';
import { SEARCH_DEBOUNCE_MS } from '@/features/Searchbar';
import { titleHead } from '@/lib/page-title';
import {
    ORGANIZATION_STATE_FILTERS,
    ORGANIZATION_SUBSCRIPTION_FILTERS,
} from '@/types/organization';
import { createFileRoute } from '@tanstack/react-router';
import { Building2, SearchX } from 'lucide-react';
import { z } from 'zod';
import {
    OrganizationFilters,
    type OrganizationFilterValues,
} from './-components/OrganizationFilters';
import { OrganizationsTable } from './-components/OrganizationsTable';
import { sortOptionFor, sortParams } from './-components/organization-filters';
import { organizationsQueryOptions } from './-hooks/use-organizations';

// Every field `.catch(undefined)`: a hand-edited or stale URL value is dropped, never a broken page.
const organizationsSearchSchema = z.object({
    q: z.string().optional().catch(undefined),
    status: z.enum(ORGANIZATION_STATE_FILTERS).optional().catch(undefined),
    subscription_status: z
        .enum(ORGANIZATION_SUBSCRIPTION_FILTERS)
        .optional()
        .catch(undefined),
    sort: z.enum(['created_at', 'name']).optional().catch(undefined),
    direction: z.enum(['asc', 'desc']).optional().catch(undefined),
    page: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/organizaciones/')({
    head: () => titleHead('Organizaciones'),
    validateSearch: (search) => organizationsSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({
        q: search.q ?? '',
        status: search.status,
        subscription_status: search.subscription_status,
        sort: search.sort,
        direction: search.direction,
        page: search.page ?? 1,
    }),
    loader: ({ context, deps }) =>
        context.queryClient.ensureQueryData(organizationsQueryOptions(deps)),
    pendingMs: SEARCH_DEBOUNCE_MS,
    pendingComponent: () => <TableSkeleton columns={5} />,
    errorComponent: RouteErrorState,
    component: OrganizacionesPage,
});

function OrganizacionesPage() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const data = Route.useLoaderData();

    const filters: OrganizationFilterValues = {
        q: search.q ?? '',
        status: search.status,
        subscription_status: search.subscription_status,
        order: sortOptionFor(search.sort, search.direction),
    };
    const isFiltered =
        filters.q !== '' ||
        filters.status !== undefined ||
        filters.subscription_status !== undefined;

    function handleFiltersChange(patch: Partial<OrganizationFilterValues>) {
        const { order, ...rest } = { ...filters, ...patch };
        void navigate({
            search: {
                ...rest,
                q: rest.q || undefined,
                ...sortParams(order),
                page: undefined,
            },
            replace: true,
        });
    }

    function clearFilters() {
        void navigate({ search: {}, replace: true });
    }

    const empty = isFiltered ? (
        <EmptyState
            icon={SearchX}
            title="Sin resultados"
            description="No hay organizaciones que coincidan con los filtros."
            action={
                <Button type="button" variant="outline" onClick={clearFilters}>
                    Limpiar filtros
                </Button>
            }
        />
    ) : (
        <EmptyState
            icon={Building2}
            title="Todavía no hay organizaciones"
            description="Las organizaciones aparecen acá cuando un consultorio se registra."
        />
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl tracking-tight">Organizaciones</h1>
            <OrganizationFilters
                values={filters}
                onChange={handleFiltersChange}
            />
            <OrganizationsTable organizations={data.data} empty={empty} />
            <DataTablePagination
                currentPage={data.meta.current_page}
                lastPage={data.meta.last_page}
                total={data.meta.total}
                label="organizaciones"
                onPageChange={(page) =>
                    void navigate({ search: (prev) => ({ ...prev, page }) })
                }
            />
        </div>
    );
}
