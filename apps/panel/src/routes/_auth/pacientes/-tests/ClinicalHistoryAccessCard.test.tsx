import { api } from '@/lib/api';
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
import {
    ClinicalHistoryAccessCard,
    NO_ACCESS_REASON,
    REASON_REQUIRED_DESCRIPTION,
} from '../-components/ClinicalHistoryAccessCard';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

function renderCard(
    access: 'denied' | 'reason_required',
    queryClient = new QueryClient(),
) {
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
            <ClinicalHistoryAccessCard patientId={10} access={access} />
        ),
    });
    const router = createRouter({
        routeTree: rootRoute.addChildren([detailRoute]),
        history: createMemoryHistory({ initialEntries: ['/pacientes/10'] }),
    });
    render(<RouterProvider router={router} />);
}

async function openDialog() {
    fireEvent.click(
        await screen.findByRole('button', { name: 'Indicar motivo' }),
    );

    return screen.findByRole('dialog', { name: 'Motivo del acceso' });
}

describe('ClinicalHistoryAccessCard', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
    });

    it('explains who can read the history, with no way to open it', async () => {
        renderCard('denied');

        await screen.findByText(NO_ACCESS_REASON);
        expect(
            screen.queryByRole('button', { name: 'Indicar motivo' }),
        ).toBeNull();
    });

    it('asks for the reason when there is no appointment near today', async () => {
        renderCard('reason_required');

        await screen.findByText(REASON_REQUIRED_DESCRIPTION);
        expect(REASON_REQUIRED_DESCRIPTION).toContain('7 días anteriores');
    });

    it('requires one of the reasons, and a few words for «Otro»', async () => {
        renderCard('reason_required');
        await openDialog();

        fireEvent.click(
            screen.getByRole('button', { name: 'Ver historia clínica' }),
        );
        await screen.findByText('Elegí un motivo.');

        fireEvent.click(screen.getByRole('radio', { name: 'Otro' }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Ver historia clínica' }),
        );
        await screen.findByText('Contá el motivo en pocas palabras.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('sends the reason and reloads the patient and its whole history', async () => {
        const queryClient = new QueryClient();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        vi.mocked(api.post).mockResolvedValueOnce({ data: { data: {} } });
        renderCard('reason_required', queryClient);
        await openDialog();

        fireEvent.click(
            screen.getByRole('radio', { name: 'Resultado de estudio' }),
        );
        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: '  Llegó la ecografía.  ' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Ver historia clínica' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/patients/10/exceptional-accesses',
                {
                    reason: 'study_result',
                    reason_detail: 'Llegó la ecografía.',
                },
            ),
        );
        await waitFor(() =>
            expect(
                invalidate.mock.calls.map(([filters]) => filters?.queryKey),
            ).toEqual([
                ['patients', 10],
                ['patients', 10, 'clinical-notes'],
                ['prescriptions', 'patient', 10],
                ['patients', 10, 'vital-signs'],
                ['patients', 10, 'medical-history'],
            ]),
        );
    });

    // An appointment near today was booked since the page loaded.
    it('reloads the page when the history turned out to be open already', async () => {
        const queryClient = new QueryClient();
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'clinical_access.reason_not_required',
                        message:
                            'This clinical history is open without a reason.',
                        context: {},
                    },
                },
            },
        });
        renderCard('reason_required', queryClient);
        await openDialog();

        fireEvent.click(screen.getByRole('radio', { name: 'Urgencia' }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Ver historia clínica' }),
        );

        await screen.findByText(/su historia clínica está abierta/);
        await waitFor(() =>
            expect(
                invalidate.mock.calls.map(([filters]) => filters?.queryKey),
            ).toEqual([
                ['patients', 10],
                ['patients', 10, 'clinical-notes'],
                ['prescriptions', 'patient', 10],
                ['patients', 10, 'vital-signs'],
                ['patients', 10, 'medical-history'],
            ]),
        );
    });

    it('sends no detail when none was written', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: { data: {} } });
        renderCard('reason_required');
        await openDialog();

        fireEvent.click(screen.getByRole('radio', { name: 'Urgencia' }));
        fireEvent.click(
            screen.getByRole('button', { name: 'Ver historia clínica' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/patients/10/exceptional-accesses',
                { reason: 'emergency', reason_detail: null },
            ),
        );
    });
});
