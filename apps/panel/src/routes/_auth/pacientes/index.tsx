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
import { SEARCH_DEBOUNCE_MS, Searchbar } from '@/features/Searchbar';
import { titleHead } from '@/lib/page-title';
import { Link, createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PatientsCardList } from './-components/PatientsCardList';
import { PatientsEmptyState } from './-components/PatientsEmptyState';
import { PatientsTable } from './-components/PatientsTable';
import {
    patientCardsQueryOptions,
    patientsQueryOptions,
} from './-hooks/use-patients';

const patientsSearchSchema = z.object({
    q: z.string().optional(),
    page: z.number().int().min(1).optional(),
    vista: listViewSearchSchema,
});

export const Route = createFileRoute('/_auth/pacientes/')({
    head: () => titleHead('Pacientes'),
    // The cards load page after page, so only the table keeps a `page` (#306).
    validateSearch: (search): z.infer<typeof patientsSearchSchema> => {
        const { q, page, vista } = patientsSearchSchema.parse(search);

        return { q, vista, page: vista === 'tabla' ? page : undefined };
    },
    loaderDeps: ({ search }) => ({
        q: search.q ?? '',
        page: search.page ?? 1,
        view: listViewOf(search.vista),
    }),
    loader: async ({ context, deps: { view, ...deps } }) => {
        if (view === 'cards') {
            await context.queryClient.ensureInfiniteQueryData(
                patientCardsQueryOptions(deps),
            );

            return { view } as const;
        }

        return {
            view,
            table: await context.queryClient.ensureQueryData(
                patientsQueryOptions(deps),
            ),
        } as const;
    },
    pendingMs: SEARCH_DEBOUNCE_MS,
    pendingComponent: PacientesPending,
    errorComponent: RouteErrorState,
    component: PacientesPage,
});

function PacientesPending() {
    const { vista } = Route.useSearch();

    return vista === 'tabla' ? (
        <TableSkeleton columns={5} />
    ) : (
        <CardGridSkeleton />
    );
}

function PacientesPage() {
    const { q = '', vista } = Route.useSearch();
    const navigate = Route.useNavigate();
    const data = Route.useLoaderData();

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
        <PatientsEmptyState
            searching={q !== ''}
            onClearSearch={() => handleSearch('')}
        />
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl tracking-tight">Pacientes</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <ListViewToggle
                        value={listViewOf(vista)}
                        onChange={handleViewChange}
                    />
                    <Button
                        render={<Link to="/pacientes/nuevo" />}
                        nativeButton={false}
                    >
                        Nuevo paciente
                    </Button>
                </div>
            </header>

            <Searchbar
                value={q}
                onSearch={handleSearch}
                placeholder="Buscar por nombre, documento o N° de afiliado…"
                label="Buscar pacientes"
                className="max-w-sm"
            />

            {data.view === 'cards' ? (
                <PatientsCardList q={q} empty={empty} />
            ) : (
                <>
                    <PatientsTable patients={data.table.data} empty={empty} />
                    <DataTablePagination
                        currentPage={data.table.meta.current_page}
                        lastPage={data.table.meta.last_page}
                        total={data.table.meta.total}
                        label="pacientes"
                        onPageChange={handlePageChange}
                    />
                </>
            )}
        </div>
    );
}
