import { ListSkeleton } from '@/components/ListSkeleton';
import { SEARCH_DEBOUNCE_MS, Searchbar } from '@/features/Searchbar';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { SpecialtiesCatalog } from './-components/SpecialtiesCatalog';
import { specialtiesQueryOptions } from './-hooks/use-specialties';

// `.catch(undefined)`: a hand-edited or stale URL value is dropped, never a broken page.
const specialtiesSearchSchema = z.object({
    q: z.string().max(100).optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/especialidades/')({
    head: () => titleHead('Especialidades'),
    validateSearch: (search) => specialtiesSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({ q: search.q?.trim() ?? '' }),
    loader: ({ context, deps }) =>
        context.queryClient.ensureQueryData(specialtiesQueryOptions(deps)),
    pendingMs: SEARCH_DEBOUNCE_MS,
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: EspecialidadesPage,
});

function EspecialidadesPage() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const usage = Route.useLoaderData();
    const setQuery = (q: string) =>
        void navigate({ search: { q: q.trim() || undefined }, replace: true });

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl tracking-tight">Especialidades</h1>
                <p className="text-sm text-muted-foreground">
                    El catálogo que llena el registro nacional de profesionales,
                    con totales de toda la plataforma. «Con respaldo»: los
                    profesionales con una matrícula verificada que la respalda.
                    «La ofrecen» y «Consultorios»: dónde la muestra hoy la
                    página de reservas. «Sin respaldo»: ofertas cuya matrícula
                    ya no la respalda.
                </p>
            </div>
            <Searchbar
                value={search.q ?? ''}
                onSearch={setQuery}
                placeholder="Buscar por profesión o especialidad…"
                label="Buscar especialidades"
                className="max-w-sm"
            />
            <SpecialtiesCatalog
                usage={usage}
                query={search.q?.trim() ?? ''}
                onClearSearch={() => setQuery('')}
            />
        </div>
    );
}
