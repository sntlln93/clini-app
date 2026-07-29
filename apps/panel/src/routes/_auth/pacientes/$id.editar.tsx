import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { createFileRoute } from '@tanstack/react-router';
import { PatientForm } from './-components/PatientForm';
import { insuranceProvidersQueryOptions } from './-hooks/use-insurance-providers';
import { patientQueryOptions } from './-hooks/use-patient';

export const Route = createFileRoute('/_auth/pacientes/$id/editar')({
    params: {
        parse: (rawParams) => ({ id: Number(rawParams.id) }),
    },
    loader: async ({ context, params }) => {
        const [patient, insuranceProviders] = await Promise.all([
            context.queryClient.ensureQueryData(patientQueryOptions(params.id)),
            context.queryClient.ensureQueryData(
                insuranceProvidersQueryOptions(),
            ),
        ]);

        return { patient, insuranceProviders };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: EditarPacientePage,
});

function EditarPacientePage() {
    const { patient, insuranceProviders } = Route.useLoaderData();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Editar paciente</h1>
            <PatientForm
                patient={patient}
                insuranceProviders={insuranceProviders}
            />
        </div>
    );
}
