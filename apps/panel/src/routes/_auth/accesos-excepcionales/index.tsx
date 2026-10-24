import { DataTablePagination } from '@/components/DataTablePagination';
import { EmptyState } from '@/components/EmptyState';
import { RouteErrorState } from '@/components/RouteErrorState';
import { TableSkeleton } from '@/components/TableSkeleton';
import { CLINICAL_ACCESS_WINDOW_DAYS } from '@/lib/clinical-access';
import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { ShieldCheck } from 'lucide-react';
import { z } from 'zod';
import { ExceptionalAccessesTable } from './-components/ExceptionalAccessesTable';
import { exceptionalAccessesQueryOptions } from './-hooks/use-exceptional-accesses';

const exceptionalAccessesSearchSchema = z.object({
    page: z.number().int().min(1).optional(),
});

// The owner's list of the practice's exceptional accesses to the clinical
// history (#325, ADR 0022). The API answers it to the owner alone; anyone else
// reaching the URL gets the route's 403 state.
export const Route = createFileRoute('/_auth/accesos-excepcionales/')({
    head: () => titleHead('Accesos a la historia clínica'),
    validateSearch: (search) => exceptionalAccessesSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
    loader: ({ context, deps }) =>
        context.queryClient.ensureQueryData(
            exceptionalAccessesQueryOptions(deps),
        ),
    pendingComponent: () => <TableSkeleton columns={4} />,
    errorComponent: RouteErrorState,
    component: AccesosExcepcionalesPage,
});

function AccesosExcepcionalesPage() {
    const navigate = Route.useNavigate();
    const data = Route.useLoaderData();

    function handlePageChange(nextPage: number) {
        void navigate({ search: (prev) => ({ ...prev, page: nextPage }) });
    }

    return (
        <div className="space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl tracking-tight">
                    Accesos a la historia clínica
                </h1>
                <p className="max-w-prose text-sm text-muted-foreground">
                    Cada vez que un profesional abre la historia clínica de un
                    paciente sin tener un turno con él en los{' '}
                    {CLINICAL_ACCESS_WINDOW_DAYS} días anteriores o siguientes,
                    indica el motivo y queda acá. No se muestra nada del
                    contenido de la historia.
                </p>
            </header>

            <ExceptionalAccessesTable
                accesses={data.data}
                empty={
                    <EmptyState
                        icon={ShieldCheck}
                        title="Sin accesos excepcionales"
                        description="Todavía nadie abrió una historia clínica sin un turno cercano con el paciente."
                    />
                }
            />

            <DataTablePagination
                currentPage={data.meta.current_page}
                lastPage={data.meta.last_page}
                total={data.meta.total}
                label="accesos"
                onPageChange={handlePageChange}
            />
        </div>
    );
}
