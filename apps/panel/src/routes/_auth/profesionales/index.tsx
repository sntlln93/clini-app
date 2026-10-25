import { DataTablePagination } from '@/components/DataTablePagination';
import { TableSkeleton } from '@/components/TableSkeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/features/empty-state/EmptyState';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { NoProfessionalsEmptyState } from '@/features/NoProfessionalsEmptyState';
import { SEARCH_DEBOUNCE_MS, Searchbar } from '@/features/Searchbar';
import { ensureScopedProfessionals } from '@/hooks/use-professionals';
import { titleHead } from '@/lib/page-title';
import { Link, createFileRoute } from '@tanstack/react-router';
import { MailPlus } from 'lucide-react';
import { z } from 'zod';
import { MembersTable } from './-components/MembersTable';
import { membershipsQueryOptions } from './-hooks/use-memberships';

const professionalsSearchSchema = z.object({
    q: z.string().optional(),
    page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute('/_auth/profesionales/')({
    head: () => titleHead('Profesionales'),
    validateSearch: (search) => professionalsSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({
        q: search.q ?? '',
        page: search.page ?? 1,
    }),
    loader: async ({ context, deps }) => {
        const [members, professionals] = await Promise.all([
            context.queryClient.ensureQueryData(membershipsQueryOptions(deps)),
            ensureScopedProfessionals(context.queryClient),
        ]);

        return { members, professionals };
    },
    pendingMs: SEARCH_DEBOUNCE_MS,
    pendingComponent: () => <TableSkeleton columns={5} />,
    errorComponent: RouteErrorState,
    component: ProfesionalesPage,
});

function ProfesionalesPage() {
    const { q = '' } = Route.useSearch();
    const navigate = Route.useNavigate();
    const { members: data, professionals } = Route.useLoaderData();
    // The list always holds the viewer's own row, so it is never empty: what
    // a new practice is missing is someone who attends (#305).
    const noProfessionals = q === '' && professionals.length === 0;

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
                illustration="search"
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
                illustration="team"
                title="Todavía no hay miembros"
                description="Invitá a alguien de tu equipo para que pueda acceder al panel."
                action={
                    <Button
                        render={<Link to="/profesionales/nuevo" />}
                        nativeButton={false}
                    >
                        <MailPlus data-icon="inline-start" />
                        Invitar miembro
                    </Button>
                }
            />
        );

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl tracking-tight">Profesionales</h1>
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
                label="Buscar miembros"
                className="max-w-sm"
            />

            {noProfessionals && (
                <NoProfessionalsEmptyState description="Invitá a quienes atienden en tu consultorio para organizar sus agendas y turnos." />
            )}

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
