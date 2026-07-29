import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { createFileRoute } from '@tanstack/react-router';
import { PatientForm } from './-components/PatientForm';
import { insuranceProvidersQueryOptions } from './-hooks/use-insurance-providers';

export const Route = createFileRoute('/_auth/pacientes/nuevo')({
    loader: ({ context }) =>
        context.queryClient.ensureQueryData(insuranceProvidersQueryOptions()),
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: NuevoPacientePage,
});

function NuevoPacientePage() {
    const insuranceProviders = Route.useLoaderData();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Nuevo paciente</h1>
            <PatientForm insuranceProviders={insuranceProviders} />
        </div>
    );
}
