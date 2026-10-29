import { DataTablePagination } from '@/components/DataTablePagination';
import { TableSkeleton } from '@/components/TableSkeleton';
import { Button } from '@/components/ui/button';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { CardGridSkeleton } from '@/features/list-view/CardGridSkeleton';
import {
    listViewOf,
    listViewSearchSchema,
    type ListView,
} from '@/features/list-view/list-view';
import { ListViewToggle } from '@/features/list-view/ListViewToggle';
import { NoProfessionalsEmptyState } from '@/features/NoProfessionalsEmptyState';
import { SEARCH_DEBOUNCE_MS, Searchbar } from '@/features/Searchbar';
import { ensureScopedProfessionals } from '@/hooks/use-professionals';
import { titleHead } from '@/lib/page-title';
import { Link, createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { MembersCardList } from './-components/MembersCardList';
import { MembersEmptyState } from './-components/MembersEmptyState';
import { MembersTable } from './-components/MembersTable';
import {
    membershipCardsQueryOptions,
    membershipsQueryOptions,
} from './-hooks/use-memberships';

const professionalsSearchSchema = z.object({
    q: z.string().optional(),
    page: z.number().int().min(1).optional(),
    vista: listViewSearchSchema,
});

export const Route = createFileRoute('/_auth/profesionales/')({
    head: () => titleHead('Profesionales'),
    // The cards load page after page, so only the table keeps a `page` (#306).
    validateSearch: (search): z.infer<typeof professionalsSearchSchema> => {
        const { q, page, vista } = professionalsSearchSchema.parse(search);

        return { q, vista, page: vista === 'tabla' ? page : undefined };
    },
    loaderDeps: ({ search }) => ({
        q: search.q ?? '',
        page: search.page ?? 1,
        view: listViewOf(search.vista),
    }),
    loader: async ({ context, deps: { view, ...deps } }) => {
        const [members, professionals] = await Promise.all([
            view === 'cards'
                ? context.queryClient
                      .ensureInfiniteQueryData(
                          membershipCardsQueryOptions(deps),
                      )
                      .then(() => null)
                : context.queryClient.ensureQueryData(
                      membershipsQueryOptions(deps),
                  ),
            ensureScopedProfessionals(context.queryClient),
        ]);

        return { members, professionals };
    },
    pendingMs: SEARCH_DEBOUNCE_MS,
    pendingComponent: ProfesionalesPending,
    errorComponent: RouteErrorState,
    component: ProfesionalesPage,
});

function ProfesionalesPending() {
    const { vista } = Route.useSearch();

    return vista === 'tabla' ? (
        <TableSkeleton columns={5} />
    ) : (
        <CardGridSkeleton />
    );
}

function ProfesionalesPage() {
    const { q = '', vista } = Route.useSearch();
    const navigate = Route.useNavigate();
    // `members` is the table's page; the cards read theirs from the cache.
    const { members, professionals } = Route.useLoaderData();
    // The list always holds the viewer's own row, so it is never empty: what
    // a new practice is missing is someone who attends (#305).
    const noProfessionals = q === '' && professionals.length === 0;

    function handleSearch(value: string) {
        void navigate({
            search: (prev) => ({ ...prev, q: value, page: undefined }),
            replace: true,
        });
    }

    function handleViewChange(view: ListView) {
        void navigate({
            search: (prev) => ({
                ...prev,
                vista: view === 'tabla' ? view : undefined,
                page: undefined,
            }),
        });
    }

    function handlePageChange(nextPage: number) {
        void navigate({ search: (prev) => ({ ...prev, page: nextPage }) });
    }

    const empty = (
        <MembersEmptyState
            searching={q !== ''}
            onClearSearch={() => handleSearch('')}
        />
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl tracking-tight">Profesionales</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <ListViewToggle
                        value={listViewOf(vista)}
                        onChange={handleViewChange}
                    />
                    <Button
                        render={<Link to="/profesionales/nuevo" />}
                        nativeButton={false}
                    >
                        Invitar miembro
                    </Button>
                </div>
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

            {members === null ? (
                <MembersCardList q={q} empty={empty} />
            ) : (
                <>
                    <MembersTable memberships={members.data} empty={empty} />
                    <DataTablePagination
                        currentPage={members.meta.current_page}
                        lastPage={members.meta.last_page}
                        total={members.meta.total}
                        label="profesionales"
                        onPageChange={handlePageChange}
                    />
                </>
            )}
        </div>
    );
}
