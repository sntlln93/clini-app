import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { titleHead } from '@/lib/page-title';
import { createFileRoute } from '@tanstack/react-router';
import { SpecialtiesCatalog } from './-components/SpecialtiesCatalog';
import { specialtiesQueryOptions } from './-hooks/use-specialties';

export const Route = createFileRoute('/_auth/especialidades/')({
    head: () => titleHead('Especialidades'),
    loader: ({ context }) =>
        context.queryClient.ensureQueryData(specialtiesQueryOptions()),
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: EspecialidadesPage,
});

function EspecialidadesPage() {
    const usage = Route.useLoaderData();

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
            <SpecialtiesCatalog usage={usage} />
        </div>
    );
}
