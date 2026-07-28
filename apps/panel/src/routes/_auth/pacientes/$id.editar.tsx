import { ListSkeleton } from '@/components/ListSkeleton';
import { createFileRoute } from '@tanstack/react-router';
import { PatientForm } from './-components/PatientForm';
import { usePatient } from './-hooks/use-patient';

export const Route = createFileRoute('/_auth/pacientes/$id/editar')({
    component: EditarPacientePage,
});

function EditarPacientePage() {
    const { id } = Route.useParams();
    const { data: patient, isPending } = usePatient(Number(id));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Editar paciente</h1>
            {isPending && <ListSkeleton />}
            {!isPending && !patient && (
                <p className="text-sm text-muted-foreground">
                    No se encontró el paciente.
                </p>
            )}
            {patient && <PatientForm patient={patient} />}
        </div>
    );
}
