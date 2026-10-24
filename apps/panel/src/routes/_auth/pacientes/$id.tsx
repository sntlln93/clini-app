import { ListSkeleton } from '@/components/ListSkeleton';
import { RouteErrorState } from '@/components/RouteErrorState';
import { Button } from '@/components/ui/button';
import { patientQueryOptions } from '@/hooks/use-patient';
import { titleHead } from '@/lib/page-title';
import { Link, createFileRoute } from '@tanstack/react-router';
import { ClinicalHistoryAccessCard } from './-components/ClinicalHistoryAccessCard';
import { ExportClinicalRecordMenu } from './-components/ExportClinicalRecordMenu';
import { PatientAppointmentHistoryCard } from './-components/PatientAppointmentHistoryCard';
import { PatientClinicalNotesCard } from './-components/PatientClinicalNotesCard';
import { PatientContactCard } from './-components/PatientContactCard';
import { PatientInsuranceCard } from './-components/PatientInsuranceCard';
import { PatientNextAppointmentCard } from './-components/PatientNextAppointmentCard';
import { PatientPersonalDataCard } from './-components/PatientPersonalDataCard';
import { PatientPrescriptionsCard } from './-components/PatientPrescriptionsCard';
import { loadClinicalHistory } from './-hooks/use-clinical-history';
import {
    findNextAppointment,
    findTodaysOwnAppointment,
    patientAppointmentsQueryOptions,
} from './-hooks/use-patient-appointments';

export const Route = createFileRoute('/_auth/pacientes/$id')({
    params: {
        parse: (rawParams) => ({ id: Number(rawParams.id) }),
    },
    loader: async ({ context, params }) => {
        const [patient, appointments] = await Promise.all([
            context.queryClient.ensureQueryData(patientQueryOptions(params.id)),
            context.queryClient.ensureQueryData(
                patientAppointmentsQueryOptions(params.id),
            ),
        ]);
        // The patient says ahead whether its history will be answered (#325).
        const history = await loadClinicalHistory(context.queryClient, patient);

        return { patient, appointments, history };
    },
    head: ({ loaderData }) => titleHead(loaderData?.patient.name, 'Pacientes'),
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: PacienteDetallePage,
});

function PacienteDetallePage() {
    const { patient, appointments, history } = Route.useLoaderData();
    const { id } = Route.useParams();

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl tracking-tight">{patient.name}</h1>
                <div className="flex flex-wrap gap-2">
                    {history.access === 'open' && (
                        <ExportClinicalRecordMenu patientId={id} />
                    )}
                    <Button
                        render={
                            <Link to="/pacientes/$id/editar" params={{ id }} />
                        }
                        nativeButton={false}
                    >
                        Editar
                    </Button>
                </div>
            </header>

            <PatientNextAppointmentCard
                appointment={findNextAppointment(appointments)}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <PatientPersonalDataCard patient={patient} />
                <PatientContactCard patient={patient} />
                <PatientInsuranceCard patient={patient} />
            </div>

            <PatientAppointmentHistoryCard appointments={appointments} />
            {history.access === 'open' ? (
                <>
                    <PatientClinicalNotesCard
                        patientId={id}
                        notes={history.notes}
                        todaysAppointmentId={
                            findTodaysOwnAppointment(appointments)?.id ?? null
                        }
                    />
                    <PatientPrescriptionsCard
                        prescriptions={history.prescriptions}
                    />
                </>
            ) : (
                <ClinicalHistoryAccessCard
                    patientId={id}
                    access={history.access}
                />
            )}
        </div>
    );
}
