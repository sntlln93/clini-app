import { DataTablePagination } from '@/components/DataTablePagination';
import { EmptyState } from '@/components/EmptyState';
import { RouteErrorState } from '@/components/RouteErrorState';
import { TableSkeleton } from '@/components/TableSkeleton';
import { Button } from '@/components/ui/button';
import { SEARCH_DEBOUNCE_MS, Searchbar } from '@/features/Searchbar';
import { Link, createFileRoute } from '@tanstack/react-router';
import { SearchX, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { MembersTable } from './-components/MembersTable';
import { membershipsQueryOptions } from './-hooks/use-memberships';

const professionalsSearchSchema = z.object({
    q: z.string().optional(),
    page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute('/_auth/profesionales/')({
    validateSearch: (search) => professionalsSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({
        q: search.q ?? '',
        page: search.page ?? 1,
    }),
    loader: ({ context, deps }) =>
        context.queryClient.ensureQueryData(membershipsQueryOptions(deps)),
    pendingMs: SEARCH_DEBOUNCE_MS,
    pendingComponent: () => <TableSkeleton columns={5} />,
    errorComponent: RouteErrorState,
    component: ProfesionalesPage,
});

function ProfesionalesPage() {
    const { q = '' } = Route.useSearch();
    const navigate = Route.useNavigate();
    const data = Route.useLoaderData();

    function handleSearch(value: string) {
        void navigate({
            search: (prev) => ({ ...prev, q: value, page: 1 }),
            replace: true,
        });
    }

    function clearSearch() {
        void navigate({
            search: (prev) => ({ ...prev, q: '', page: 1 }),
            replace: true,
        });
    }

    function handlePageChange(nextPage: number) {
        void navigate({ search: (prev) => ({ ...prev, page: nextPage }) });
    }

    const empty =
        q !== '' ? (
            <EmptyState
                icon={SearchX}
                title="Sin resultados"
                description="No encontramos miembros que coincidan con la búsqueda."
                action={
                    <Button
                        type="button"
                        variant="outline"
                        onClick={clearSearch}
                    >
                        Limpiar búsqueda
                    </Button>
                }
            />
        ) : (
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

            <Searchbar
                value={q}
                onSearch={handleSearch}
                placeholder="Buscar por nombre o email…"
                className="max-w-sm"
            />

            <MembersTable memberships={data.data} empty={empty} />

            <DataTablePagination
                currentPage={data.meta.current_page}
                lastPage={data.meta.last_page}
                total={data.meta.total}
                label="profesionales"
                onPageChange={handlePageChange}
            />
        </div>
    );
}
