import { DataTablePagination } from '@/components/DataTablePagination';
import { EmptyState } from '@/components/EmptyState';
import { RouteErrorState } from '@/components/RouteErrorState';
import { TableSkeleton } from '@/components/TableSkeleton';
import { Button } from '@/components/ui/button';
import { SEARCH_DEBOUNCE_MS } from '@/features/Searchbar';
import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { SearchX, Users } from 'lucide-react';
import { z } from 'zod';
import {
    UserFilters,
    type BooleanFilter,
    type UserFilterValues,
} from './-components/UserFilters';
import { UsersTable } from './-components/UsersTable';
import { usersQueryOptions } from './-hooks/use-users';

// Real booleans in the URL (`?blocked=true`); the select and the API
// (`in:true,false`) both speak the 'true'/'false' strings, see `toFilter`.
const booleanFilter = z.boolean().optional().catch(undefined);

function toFilter(value: boolean | undefined): BooleanFilter | undefined {
    return value === undefined ? undefined : value ? 'true' : 'false';
}

function fromFilter(value: BooleanFilter | undefined): boolean | undefined {
    return value === undefined ? undefined : value === 'true';
}

const usersSearchSchema = z.object({
    q: z.string().optional().catch(undefined),
    verified: booleanFilter,
    blocked: booleanFilter,
    page: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/usuarios/')({
    head: () => titleHead('Usuarios'),
    validateSearch: (search) => usersSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({
        q: search.q ?? '',
        verified: toFilter(search.verified),
        blocked: toFilter(search.blocked),
        page: search.page ?? 1,
    }),
    loader: ({ context, deps }) =>
        context.queryClient.ensureQueryData(usersQueryOptions(deps)),
    pendingMs: SEARCH_DEBOUNCE_MS,
    pendingComponent: () => <TableSkeleton columns={4} />,
    errorComponent: RouteErrorState,
    component: UsuariosPage,
});

function UsuariosPage() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const data = Route.useLoaderData();

    const filters: UserFilterValues = {
        q: search.q ?? '',
        verified: toFilter(search.verified),
        blocked: toFilter(search.blocked),
    };
    const isFiltered =
        filters.q !== '' ||
        filters.verified !== undefined ||
        filters.blocked !== undefined;

    function handleFiltersChange(patch: Partial<UserFilterValues>) {
        const next = { ...filters, ...patch };
        void navigate({
            search: {
                q: next.q || undefined,
                verified: fromFilter(next.verified),
                blocked: fromFilter(next.blocked),
                page: undefined,
            },
            replace: true,
        });
    }

    const empty = isFiltered ? (
        <EmptyState
            icon={SearchX}
            title="Sin resultados"
            description="No hay usuarios que coincidan con los filtros."
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
            icon={Users}
            title="Todavía no hay usuarios"
            description="Los usuarios aparecen acá cuando se registran o aceptan una invitación."
        />
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl tracking-tight">Usuarios</h1>
            <UserFilters values={filters} onChange={handleFiltersChange} />
            <UsersTable users={data.data} empty={empty} />
            <DataTablePagination
                currentPage={data.meta.current_page}
                lastPage={data.meta.last_page}
                total={data.meta.total}
                label="usuarios"
                onPageChange={(page) =>
                    void navigate({ search: (prev) => ({ ...prev, page }) })
                }
            />
        </div>
    );
}
