import { api } from '@/lib/api';
import { buildMedicalHistoryEntry } from '@/tests/fixtures/medical-history';
import { buildPrescription } from '@/tests/fixtures/prescription';
import type { MedicalHistoryEntry } from '@/types/medical-history';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrescriptionsDialog } from './PrescriptionsDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

function mockGets({
    allergies = [],
    allergiesError,
}: {
    allergies?: MedicalHistoryEntry[];
    allergiesError?: unknown;
} = {}) {
    vi.mocked(api.get).mockImplementation((url: string) => {
        if (!url.endsWith('/allergies')) {
            return Promise.resolve({ data: { data: [] } });
        }

        return allergiesError
            ? Promise.reject(allergiesError)
            : Promise.resolve({ data: { data: allergies } });
    });
}

function conflict(code: string, context: Record<string, unknown>) {
    return {
        isAxiosError: true,
        response: {
            status: 409,
            data: { message: 'Conflict.', error: { code, context } },
        },
    };
}

function allergyWarning(context: Record<string, unknown>) {
    return conflict('prescriptions.allergy_warning', {
        allergies: [],
        hidden_allergy_ids: [],
        reason_required: false,
        ...context,
    });
}

function renderDialog(onSaved = vi.fn()) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <PrescriptionsDialog
                    open
                    onOpenChange={() => {}}
                    appointment={{ id: 42 }}
                    onSaved={onSaved}
                />
            </QueryClientProvider>
        ),
    });
    const router = createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
}

async function submitMedication(medication: string) {
    fireEvent.change(await screen.findByLabelText('Medicamento'), {
        target: { value: medication },
    });
    fireEvent.change(screen.getByLabelText('Posología'), {
        target: { value: '1 cada 8 h' },
    });
    fireEvent.click(
        screen.getByRole('button', { name: 'Registrar medicación' }),
    );
}

const PENICILLIN_WARNING = allergyWarning({
    allergies: [
        {
            id: 3,
            description: 'Penicilina',
            reaction: 'Urticaria',
            severity: 'severe',
        },
    ],
});

// #362: the patient's current allergies above the form, and a warning that
// doesn't block when the medication matches one.
describe('allergy warning when indicating medication', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
    });

    it("lists the patient's current allergies above the form", async () => {
        mockGets({ allergies: [buildMedicalHistoryEntry()] });
        renderDialog();

        expect(
            await screen.findByRole('heading', { name: 'Alergias vigentes' }),
        ).toBeTruthy();
        expect(await screen.findByText('Penicilina')).toBeTruthy();
        expect(screen.getByText(/Urticaria · Severidad grave/)).toBeTruthy();
        expect(api.get).toHaveBeenCalledWith('/appointments/42/allergies');
    });

    it('says when there is no current allergy it can show', async () => {
        mockGets();
        renderDialog();

        expect(
            await screen.findByText(
                'No hay alergias vigentes registradas que puedas ver.',
            ),
        ).toBeTruthy();
    });

    it('explains that the allergies take an exceptional access without an appointment near today', async () => {
        mockGets({
            allergiesError: conflict('clinical_access.reason_required', {}),
        });
        renderDialog();

        expect(
            await screen.findByText(
                /con un acceso excepcional, desde su ficha/,
            ),
        ).toBeTruthy();
    });

    it('shows the matched allergy and saves only with «Indicar igual», sending it back confirmed', async () => {
        mockGets();
        vi.mocked(api.post)
            .mockRejectedValueOnce(PENICILLIN_WARNING)
            .mockResolvedValueOnce({ data: {} });
        const onSaved = vi.fn();
        renderDialog(onSaved);

        await submitMedication('Penicilina G');

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain('Alergia vigente');
        expect(alert.textContent).toContain(
            'Penicilina · Urticaria · Severidad grave',
        );
        expect(onSaved).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Indicar igual' }));

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
        expect(api.post).toHaveBeenLastCalledWith(
            '/appointments/42/prescriptions',
            {
                items: [
                    {
                        medication: 'Penicilina G',
                        presentation: null,
                        dosage: '1 cada 8 h',
                        quantity: 1,
                    },
                ],
                confirmed_allergy_ids: [3],
            },
        );
    });

    it("warns about another author's allergy without its detail, and asks for the patient's code", async () => {
        mockGets();
        vi.mocked(api.post)
            .mockRejectedValueOnce(allergyWarning({ hidden_allergy_ids: [9] }))
            .mockResolvedValueOnce({ data: {} });
        renderDialog();

        await submitMedication('Amoxicilina');

        const alert = await screen.findByRole('alert');
        expect(alert.textContent).toContain(
            'El paciente tiene una alergia registrada que coincide con esta medicación. Pedile el código para verla.',
        );

        fireEvent.click(screen.getByRole('button', { name: 'Indicar igual' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenLastCalledWith(
                '/appointments/42/prescriptions',
                expect.objectContaining({ confirmed_allergy_ids: [9] }),
            ),
        );
    });

    it('points to the exceptional access when that is what withholds the detail', async () => {
        mockGets();
        vi.mocked(api.post).mockRejectedValueOnce(
            allergyWarning({ hidden_allergy_ids: [9], reason_required: true }),
        );
        renderDialog();

        await submitMedication('Amoxicilina');

        expect((await screen.findByRole('alert')).textContent).toContain(
            'Para verla, abrí su historia clínica con un acceso excepcional.',
        );
    });

    it('drops the warning once the medication changes, so «Indicar igual» never confirms something else', async () => {
        mockGets();
        vi.mocked(api.post).mockRejectedValueOnce(PENICILLIN_WARNING);
        renderDialog();

        await submitMedication('Penicilina G');
        await screen.findByRole('alert');

        fireEvent.change(screen.getByLabelText('Medicamento'), {
            target: { value: 'Cefalexina' },
        });

        await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
        expect(
            screen.queryByRole('button', { name: 'Indicar igual' }),
        ).toBeNull();
    });

    it('«Revisar la medicación» closes the warning without saving', async () => {
        mockGets();
        vi.mocked(api.post).mockRejectedValueOnce(PENICILLIN_WARNING);
        renderDialog();

        await submitMedication('Penicilina G');
        await screen.findByRole('alert');
        fireEvent.click(
            screen.getByRole('button', { name: 'Revisar la medicación' }),
        );

        await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
        expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('marks medication indicated despite an allergy warning', async () => {
        vi.mocked(api.get).mockImplementation((url: string) =>
            Promise.resolve({
                data: {
                    data: url.endsWith('/allergies')
                        ? []
                        : [
                              buildPrescription({
                                  allergy_warning_overridden: true,
                              }),
                          ],
                },
            }),
        );
        renderDialog();

        expect(
            await screen.findByText('Indicada pese a un aviso de alergia.'),
        ).toBeTruthy();
    });
});
