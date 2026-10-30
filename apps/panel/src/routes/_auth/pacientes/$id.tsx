import { ListSkeleton } from '@/components/ListSkeleton';
import { Button } from '@/components/ui/button';
import { RouteErrorState } from '@/features/error-page/RouteErrorState';
import { SEARCH_DEBOUNCE_MS } from '@/features/Searchbar';
import { patientQueryOptions } from '@/hooks/use-patient';
import { titleHead } from '@/lib/page-title';
import { Link, createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { scrollToClinicalAccessTrail } from './-components/clinical-access-trail';
import { ClinicalAccessTrailCard } from './-components/ClinicalAccessTrailCard';
import { ClinicalHistoryAccessCard } from './-components/ClinicalHistoryAccessCard';
import { ExportClinicalRecordMenu } from './-components/ExportClinicalRecordMenu';
import { PatientAppointmentHistoryCard } from './-components/PatientAppointmentHistoryCard';
import { PatientClinicalNotesCard } from './-components/PatientClinicalNotesCard';
import { PatientContactCard } from './-components/PatientContactCard';
import { PatientInsuranceCard } from './-components/PatientInsuranceCard';
import { PatientMedicalHistoryCard } from './-components/PatientMedicalHistoryCard';
import { PatientNextAppointmentCard } from './-components/PatientNextAppointmentCard';
import { PatientPersonalDataCard } from './-components/PatientPersonalDataCard';
import { PatientPrescriptionsCard } from './-components/PatientPrescriptionsCard';
import { PatientVitalSignsCard } from './-components/PatientVitalSignsCard';
import { loadClinicalHistory } from './-hooks/use-clinical-history';
import {
    findNextAppointment,
    findTodaysOwnAppointment,
    patientAppointmentsQueryOptions,
} from './-hooks/use-patient-appointments';

// `registro`: the page of the clinical history's access trail (#325).
const patientSearchSchema = z.object({
    registro: z.number().int().min(1).optional().catch(undefined),
});

export const Route = createFileRoute('/_auth/pacientes/$id')({
    params: {
        parse: (rawParams) => ({ id: Number(rawParams.id) }),
    },
    validateSearch: (search) => patientSearchSchema.parse(search),
    loaderDeps: ({ search }) => ({ trailPage: search.registro ?? 1 }),
    loader: async ({ context, params, deps, cause }) => {
        const [patient, appointments] = await Promise.all([
            context.queryClient.ensureQueryData(patientQueryOptions(params.id)),
            context.queryClient.ensureQueryData(
                patientAppointmentsQueryOptions(params.id),
            ),
        ]);
        // The patient says ahead whether its history will be answered (#325).
        const history = await loadClinicalHistory(
            context.queryClient,
            patient,
            {
                trailPage: deps.trailPage,
                fresh: cause === 'enter',
            },
        );

        return { patient, appointments, history };
    },
    head: ({ loaderData }) => titleHead(loaderData?.patient.name, 'Pacientes'),
    // Paging the trail keeps the page on screen instead of the skeleton.
    pendingMs: SEARCH_DEBOUNCE_MS,
    pendingComponent: () => <ListSkeleton />,
    errorComponent: RouteErrorState,
    component: PacienteDetallePage,
});

function PacienteDetallePage() {
    const { patient, appointments, history } = Route.useLoaderData();
    const { id } = Route.useParams();
    const navigate = Route.useNavigate();
    const todaysAppointmentId =
        findTodaysOwnAppointment(appointments)?.id ?? null;

    // Only rewrites this page's search, so the window doesn't jump to the top
    // (#279); once the new page is on screen, the trail is brought back.
    function handleTrailPageChange(page: number) {
        void navigate({
            search: (prev) => ({ ...prev, registro: page }),
            resetScroll: false,
        }).then(scrollToClinicalAccessTrail);
    }

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

            {/* Two columns on a wide screen, the wide cards across both;
                one column on a phone, in the same order. */}
            <div className="grid grid-cols-1 gap-6 *:min-w-0 md:grid-cols-2">
                <PatientNextAppointmentCard
                    appointment={findNextAppointment(appointments)}
                />
                <PatientPersonalDataCard patient={patient} />
                <PatientContactCard patient={patient} />
                <PatientInsuranceCard patient={patient} />
                <div className="md:col-span-2">
                    <PatientAppointmentHistoryCard
                        appointments={appointments}
                    />
                </div>
                {history.access === 'open' ? (
                    <>
                        <PatientClinicalNotesCard
                            patientId={id}
                            notes={history.notes}
                            todaysAppointmentId={todaysAppointmentId}
                        />
                        <PatientPrescriptionsCard
                            patientId={id}
                            prescriptions={history.prescriptions}
                            todaysAppointmentId={todaysAppointmentId}
                        />
                        <div className="md:col-span-2">
                            <PatientVitalSignsCard
                                patientId={id}
                                vitalSigns={history.vitalSigns}
                                todaysAppointmentId={todaysAppointmentId}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <PatientMedicalHistoryCard
                                patientId={id}
                                history={history.medicalHistory}
                                todaysAppointmentId={todaysAppointmentId}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <ClinicalAccessTrailCard
                                trail={history.trail}
                                onPageChange={handleTrailPageChange}
                            />
                        </div>
                    </>
                ) : (
                    <div className="md:col-span-2">
                        <ClinicalHistoryAccessCard
                            patientId={id}
                            access={history.access}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
