import { api } from '@/lib/api';
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

function buildNote(overrides: Partial<ClinicalNote> = {}): ClinicalNote {
    return {
        id: 1,
        appointment_id: 42,
        membership_id: 1,
        body: 'Nota original.',
        created_at: '2026-08-03T09:00:00',
        updated_at: '2026-08-03T09:00:00',
        author_name: 'Dra. Ana Gomez',
        ...overrides,
    };
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
        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'Paciente refiere mejoría.' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Guardar nota' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/77/clinical-notes',
                { body: 'Paciente refiere mejoría.' },
            ),
        );
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
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
});
