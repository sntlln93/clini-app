import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { Button } from '@/components/ui/button';
import { Link, createFileRoute } from '@tanstack/react-router';
import { PatientAppointmentHistoryCard } from './-components/PatientAppointmentHistoryCard';
import { PatientClinicalNotesCard } from './-components/PatientClinicalNotesCard';
import { PatientContactCard } from './-components/PatientContactCard';
import { PatientInsuranceCard } from './-components/PatientInsuranceCard';
import { PatientPersonalDataCard } from './-components/PatientPersonalDataCard';
import { PatientPrescriptionsCard } from './-components/PatientPrescriptionsCard';
import { patientQueryOptions } from './-hooks/use-patient';
import {
    findTodaysOwnAppointment,
    patientAppointmentsQueryOptions,
} from './-hooks/use-patient-appointments';
import { patientClinicalNotesQueryOptions } from './-hooks/use-patient-clinical-notes';
import { patientPrescriptionsQueryOptions } from './-hooks/use-patient-prescriptions';

export const Route = createFileRoute('/_auth/pacientes/$id')({
    params: {
        parse: (rawParams) => ({ id: Number(rawParams.id) }),
    },
    loader: async ({ context, params }) => {
        const [patient, appointments, notes, prescriptions] = await Promise.all(
            [
                context.queryClient.ensureQueryData(
                    patientQueryOptions(params.id),
                ),
                context.queryClient.ensureQueryData(
                    patientAppointmentsQueryOptions(params.id),
                ),
                context.queryClient.ensureQueryData(
                    patientClinicalNotesQueryOptions(params.id),
                ),
                context.queryClient.ensureQueryData(
                    patientPrescriptionsQueryOptions(params.id),
                ),
            ],
        );

        return { patient, appointments, notes, prescriptions };
    },
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: PacienteDetallePage,
});

function PacienteDetallePage() {
    const { patient, appointments, notes, prescriptions } =
        Route.useLoaderData();
    const { id } = Route.useParams();

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold">{patient.name}</h1>
                <Button
                    render={<Link to="/pacientes/$id/editar" params={{ id }} />}
                    nativeButton={false}
                >
                    Editar
                </Button>
            </header>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <PatientPersonalDataCard patient={patient} />
                <PatientContactCard patient={patient} />
                {patient.insurance_provider && (
                    <PatientInsuranceCard
                        insuranceProvider={patient.insurance_provider}
                    />
                )}
            </div>

            <PatientAppointmentHistoryCard appointments={appointments} />
            <PatientClinicalNotesCard
                patientId={id}
                notes={notes}
                todaysAppointmentId={
                    findTodaysOwnAppointment(appointments)?.id ?? null
                }
            />
            <PatientPrescriptionsCard prescriptions={prescriptions} />
        </div>
    );
}
