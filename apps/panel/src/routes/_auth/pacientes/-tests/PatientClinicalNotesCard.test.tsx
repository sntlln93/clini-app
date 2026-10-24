import { api } from '@/lib/api';
import { planQueryOptions } from '@/lib/plan';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { notifySuccess } from '@/lib/toast';
import { buildClinicalNote } from '@/tests/fixtures/clinical-note';
import { buildPlan } from '@/tests/fixtures/plan';
import { buildSubscription } from '@/tests/fixtures/subscription';
import type { ClinicalNote } from '@/types/clinical-note';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRoute,
    createRouter,
    Outlet,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientClinicalNotesCard } from '../-components/PatientClinicalNotesCard';
import { patientClinicalNotesQueryOptions } from '../-hooks/use-patient-clinical-notes';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

// The acting membership is 1, the fixture notes' author.
vi.mock('@/lib/session', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/session')>()),
    useSession: () => ({ data: { membership: { id: 1 } } }),
}));

// The agenda's dialogs, tested in features/clinical-notes: here only which
// note and appointment the card hands them matters.
vi.mock('@/features/clinical-notes/ClinicalNotesDialog', () => ({
    ClinicalNotesDialog: (props: {
        open: boolean;
        appointment: { id: number; patient_id: number } | null;
        amendOnOpen: ClinicalNote | null;
        allowCreate?: boolean;
        finalFocus?: { current: HTMLElement | null };
        onOpenChange: (open: boolean) => void;
    }) => (
        <>
            {/* Rendered closed too: what it would show while it fades out. */}
            <span data-testid="notes-dialog-target">
                {props.appointment?.id ?? 'ninguno'}
            </span>
            {props.open && (
                <div role="dialog" aria-label="Notas clínicas">
                    Enmendar la nota {props.amendOnOpen?.id} del turno{' '}
                    {props.appointment?.id} de {props.appointment?.patient_id}
                    {props.allowCreate === false && ' · solo enmienda'}
                    {props.finalFocus?.current?.tagName === 'DIV' &&
                        ' · foco a la lista'}
                    <button
                        type="button"
                        onClick={() => props.onOpenChange(false)}
                    >
                        Cerrar
                    </button>
                </div>
            )}
        </>
    ),
}));
vi.mock('@/features/clinical-notes/AnnulClinicalNoteDialog', () => ({
    AnnulClinicalNoteDialog: (props: {
        note: ClinicalNote | null;
        appointment: { id: number } | null;
    }) =>
        props.note ? (
            <div role="dialog" aria-label="Anular nota">
                Anular la nota {props.note.id} del turno {props.appointment?.id}
            </div>
        ) : null,
}));

function buildNote(overrides: Partial<ClinicalNote> = {}): ClinicalNote {
    return buildClinicalNote({ author_name: 'Dra. Ana Gomez', ...overrides });
}

function renderCard({
    patientId = 10,
    notes = [],
    todaysAppointmentId = null,
    queryClient = new QueryClient(),
}: {
    patientId?: number;
    notes?: ClinicalNote[];
    todaysAppointmentId?: number | null;
    queryClient?: QueryClient;
} = {}) {
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <Outlet />
            </QueryClientProvider>
        ),
    });
    const detailRoute = createRoute({
        getParentRoute: () => rootRoute,
        path: '/pacientes/$id',
        component: () => (
            <PatientClinicalNotesCard
                patientId={patientId}
                notes={notes}
                todaysAppointmentId={todaysAppointmentId}
            />
        ),
    });
    const routeTree = rootRoute.addChildren([detailRoute]);
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({
            initialEntries: [`/pacientes/${patientId}`],
        }),
    });
    render(<RouterProvider router={router} />);
}

describe('PatientClinicalNotesCard', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
        vi.mocked(notifySuccess).mockReset();
    });

    it("renders the patient's notes, including notes authored by another professional", async () => {
        const ownNote = buildNote({
            id: 1,
            body: 'Nota propia.',
            author_name: 'Dra. Ana Gomez',
        });
        const otherNote = buildNote({
            id: 2,
            body: 'Nota de otro profesional.',
            author_name: 'Dr. Luis Perez',
        });

        renderCard({ notes: [ownNote, otherNote] });

        await screen.findByText('Nota propia.');
        expect(screen.getByText('Dra. Ana Gomez')).toBeTruthy();
        expect(screen.getByText('Nota de otro profesional.')).toBeTruthy();
        expect(screen.getByText('Dr. Luis Perez')).toBeTruthy();
    });

    it("shows each note's ICD-10 diagnoses in the patient's record (#324)", async () => {
        renderCard({
            notes: [
                buildNote({
                    body: 'Dolor de garganta.',
                    diagnoses: [
                        {
                            icd10_code_id: 7,
                            code: 'J02.9',
                            description: 'Faringitis aguda, no especificada',
                        },
                    ],
                }),
            ],
        });

        await screen.findByText('Dolor de garganta.');
        expect(screen.getByText('J02.9')).toBeTruthy();
        expect(
            screen.getByText('Faringitis aguda, no especificada'),
        ).toBeTruthy();
    });

    it('shows the "Agregar nota" control when there is an own appointment today', async () => {
        renderCard({ todaysAppointmentId: 77 });

        await screen.findByRole('button', { name: 'Agregar nota' });
    });

    it('does not render the "Agregar nota" control when there is none', async () => {
        renderCard({ todaysAppointmentId: null });

        await screen.findByText(
            'Todavía no hay notas clínicas para este paciente.',
        );
        expect(
            screen.queryByRole('button', { name: 'Agregar nota' }),
        ).toBeNull();
        expect(
            screen.getByText(
                'Podés agregar notas cuando tengas un turno con este paciente hoy.',
            ),
        ).toBeTruthy();
    });

    it.each(['expired'] as const)(
        'hides the "Agregar nota" control while the subscription is %s, keeping the notes',
        async (status) => {
            const queryClient = new QueryClient();
            queryClient.setQueryData(
                subscriptionQueryOptions.queryKey,
                buildSubscription(status),
            );

            renderCard({
                notes: [buildNote({ body: 'Nota previa.' })],
                todaysAppointmentId: 77,
                queryClient,
            });

            await screen.findByText('Nota previa.');
            expect(
                screen.queryByRole('button', { name: 'Agregar nota' }),
            ).toBeNull();
            expect(screen.queryByRole('textbox')).toBeNull();
            expect(
                screen.getByText(
                    'Tu suscripción no está activa: las notas clínicas son de solo lectura.',
                ),
            ).toBeTruthy();
        },
    );

    it('names the plan limit, not the subscription, when Free has more active professionals than it allows', async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(
            planQueryOptions.queryKey,
            buildPlan('free', { active_professionals: 2 }),
        );

        renderCard({
            notes: [buildNote({ body: 'Nota previa.' })],
            todaysAppointmentId: 77,
            queryClient,
        });

        await screen.findByText('Nota previa.');
        expect(
            screen.queryByRole('button', { name: 'Agregar nota' }),
        ).toBeNull();
        expect(
            screen.getByText(
                /El plan Gratis incluye un solo profesional activo/,
            ),
        ).toBeTruthy();
        expect(screen.queryByText(/Tu suscripción no está activa/)).toBeNull();
    });

    it("submitting the form posts the typed body against today's appointment and the list refreshes", async () => {
        const queryClient = new QueryClient();
        vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [] } });
        await queryClient.ensureQueryData(patientClinicalNotesQueryOptions(10));

        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        vi.mocked(api.get).mockResolvedValueOnce({
            data: { data: [buildNote({ id: 2, body: 'Nota nueva.' })] },
        });

        renderCard({ patientId: 10, todaysAppointmentId: 77, queryClient });

        fireEvent.click(
            await screen.findByRole('button', { name: 'Agregar nota' }),
        );
        const textbox = screen.getByRole('textbox', {
            name: 'Nueva nota clínica',
        });
        expect(textbox.getAttribute('placeholder')).toBe(
            'Escribí la nota de la visita…',
        );
        fireEvent.change(textbox, {
            target: { value: 'Paciente refiere mejoría.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/77/clinical-notes',
                { body: 'Paciente refiere mejoría.', icd10_code_ids: [] },
            ),
        );
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
        await waitFor(() =>
            expect(notifySuccess).toHaveBeenCalledWith('Nota guardada'),
        );
    });

    it('explains nothing when a note can be added', async () => {
        renderCard({ todaysAppointmentId: 77 });

        await screen.findByRole('button', { name: 'Agregar nota' });
        expect(screen.queryByText(/Podés agregar notas/)).toBeNull();
    });

    it('an empty or whitespace-only body does not trigger the mutation and shows the validation message', async () => {
        renderCard({ todaysAppointmentId: 77 });

        fireEvent.click(
            await screen.findByRole('button', { name: 'Agregar nota' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }));

        await screen.findByText('La nota no puede estar vacía.');
        expect(api.post).not.toHaveBeenCalled();

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: '   ' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }));

        await screen.findByText('La nota no puede estar vacía.');
        expect(api.post).not.toHaveBeenCalled();
    });
    // ADR 0019: only its author amends or annuls a note, and never once annulled.
    it("offers amending and annulling the acting membership's own notes only", async () => {
        renderCard({
            notes: [
                buildNote({ id: 1, body: 'Nota propia.', membership_id: 1 }),
                buildNote({ id: 2, body: 'Nota ajena.', membership_id: 2 }),
                buildNote({
                    id: 3,
                    body: 'Nota anulada.',
                    membership_id: 1,
                    annulment: {
                        reason: 'Error.',
                        created_at: '2026-08-04T10:00:00Z',
                    },
                }),
            ],
        });

        await screen.findByText('Nota propia.');
        expect(
            screen.getAllByRole('button', { name: 'Enmendar' }),
        ).toHaveLength(1);
        expect(screen.getAllByRole('button', { name: 'Anular' })).toHaveLength(
            1,
        );
    });

    it("amends and annuls on the note's own appointment, as the agenda does", async () => {
        renderCard({
            notes: [buildNote({ id: 1, appointment_id: 44, membership_id: 1 })],
        });

        fireEvent.click(
            await screen.findByRole('button', { name: 'Enmendar' }),
        );
        expect(
            screen.getByRole('dialog', { name: 'Notas clínicas' }).textContent,
        ).toContain(
            'Enmendar la nota 1 del turno 44 de 10 · solo enmienda · foco a la lista',
        );

        fireEvent.click(screen.getByRole('button', { name: 'Anular' }));
        expect(
            screen.getByRole('dialog', { name: 'Anular nota' }).textContent,
        ).toContain('Anular la nota 1 del turno 44');
    });

    // The list must not empty while the popup fades out.
    it("keeps the amended note's appointment once the dialog closes", async () => {
        renderCard({
            notes: [buildNote({ id: 1, appointment_id: 44, membership_id: 1 })],
        });

        fireEvent.click(
            await screen.findByRole('button', { name: 'Enmendar' }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

        expect(
            screen.queryByRole('dialog', { name: 'Notas clínicas' }),
        ).toBeNull();
        expect(screen.getByTestId('notes-dialog-target').textContent).toBe(
            '44',
        );
    });
});

describe('patientClinicalNotesQueryOptions', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    // The loader only asks once the patient says the history is open (#325),
    // so a 403 is a real error again and fails the page like any other.
    it('fails on a 403 like on any other error', async () => {
        const error = {
            isAxiosError: true,
            response: {
                status: 403,
                data: { message: 'This action is unauthorized.' },
            },
        };
        vi.mocked(api.get).mockRejectedValueOnce(error);

        await expect(
            new QueryClient().fetchQuery(patientClinicalNotesQueryOptions(10)),
        ).rejects.toBe(error);
    });

    it('still fails on any other error', async () => {
        const error = {
            isAxiosError: true,
            response: { status: 500, data: {} },
        };
        vi.mocked(api.get).mockRejectedValueOnce(error);

        await expect(
            new QueryClient().fetchQuery(patientClinicalNotesQueryOptions(10)),
        ).rejects.toBe(error);
    });
});
