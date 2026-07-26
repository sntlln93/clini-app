import { createFileRoute } from '@tanstack/react-router';
import { PatientForm } from './-components/PatientForm';

export const Route = createFileRoute('/_auth/pacientes/nuevo')({
    component: NuevoPacientePage,
});

function NuevoPacientePage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Nuevo paciente</h1>
            <PatientForm />
        </div>
    );
}
