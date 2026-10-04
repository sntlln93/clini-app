import { api } from '@/lib/api';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { buildSubscription } from '@/tests/fixtures/subscription';
import type { Appointment } from '@/types/appointment';
import type { Prescription } from '@/types/prescription';
import type { Subscription } from '@/types/subscription';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrescriptionsDialog } from '../-components/PrescriptionsDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const APPOINTMENT: Appointment = {
    id: 42,
    membership_id: 1,
    patient_id: 50,
    service_id: 100,
    status: 'scheduled',
    origin: 'manual',
    start_at: '2026-08-03T10:00:00',
    end_at: '2026-08-03T10:30:00',
    reason: null,
    notes: null,
    cancelled_at: null,
    cancellation_reason: null,
    rescheduled_from_id: null,
    arrived_at: null,
};

function buildPrescription(
    overrides: Partial<Prescription> = {},
): Prescription {
    return {
        id: 7,
        appointment_id: 42,
        patient_id: 50,
        membership_id: 1,
        diagnosis: 'Faringitis',
        issued_at: '2026-08-03T10:15:00',
        created_at: '2026-08-03T10:15:00',
        updated_at: '2026-08-03T10:15:00',
        items: [
            {
                id: 1,
                position: 0,
                medication: 'Amoxicilina',
                presentation: 'Comprimidos 500 mg',
                dosage: '1 cada 8 h por 7 días',
                quantity: 2,
            },
        ],
        patient_name: 'Juan Pérez',
        patient_document_type: 'dni',
        patient_document_number: '30111222',
        author_name: 'Dra. Ana Gomez',
        author_specialties: ['Clínica médica'],
        ...overrides,
    };
}

function renderDialog(open: boolean = true, subscription?: Subscription) {
    const queryClient = new QueryClient();
    if (subscription !== undefined) {
        queryClient.setQueryData(
            subscriptionQueryOptions.queryKey,
            subscription,
        );
    }
    const rootRoute = createRootRoute({
        component: () => (
            <QueryClientProvider client={queryClient}>
                <PrescriptionsDialog
                    open={open}
                    onOpenChange={() => {}}
                    appointment={APPOINTMENT}
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

function fillItem(index: number, medication: string, dosage: string) {
    fireEvent.change(screen.getAllByLabelText('Medicamento')[index], {
        target: { value: medication },
    });
    fireEvent.change(screen.getAllByLabelText('Posología')[index], {
        target: { value: dosage },
    });
}

describe('PrescriptionsDialog', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset();
        vi.mocked(api.patch).mockReset();
    });

    it("lists the appointment's prescriptions with a print link to the printable view", async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: { data: [buildPrescription()] },
        });
        renderDialog();

        await screen.findByText('Amoxicilina × 2');
        expect(api.get).toHaveBeenCalledWith('/appointments/42/prescriptions');
        const printLink = screen.getByRole('link', { name: 'Imprimir' });
        expect(printLink.getAttribute('href')).toBe('/recetas/7');
        expect(printLink.getAttribute('target')).toBe('_blank');
    });

    it('makes no request while the dialog is closed', () => {
        renderDialog(false);

        expect(api.get).not.toHaveBeenCalled();
    });

    it('starts with one item row that cannot be removed, and adds/removes rows', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        renderDialog();

        await screen.findByText('Todavía no emitiste recetas para este turno.');
        expect(screen.getAllByLabelText('Medicamento')).toHaveLength(1);
        expect(screen.queryByRole('button', { name: /Quitar/ })).toBeNull();

        fireEvent.click(
            screen.getByRole('button', { name: 'Agregar medicamento' }),
        );
        expect(screen.getAllByLabelText('Medicamento')).toHaveLength(2);
        // Each row is a group named by its legend, so the rows stay distinguishable.
        expect(
            screen.getByRole('group', { name: 'Medicamento 2' }),
        ).toBeTruthy();

        fireEvent.click(
            screen.getByRole('button', { name: 'Quitar medicamento 2' }),
        );
        expect(screen.getAllByLabelText('Medicamento')).toHaveLength(1);
        expect(screen.queryByRole('button', { name: /Quitar/ })).toBeNull();
    });

    it('issuing posts the diagnosis and every item, then refetches the list', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

        fireEvent.change(screen.getByLabelText('Diagnóstico (opcional)'), {
            target: { value: 'Faringitis' },
        });
        fillItem(0, 'Amoxicilina', '1 cada 8 h');
        fireEvent.change(screen.getByLabelText('Presentación'), {
            target: { value: 'Comprimidos 500 mg' },
        });
        fireEvent.change(screen.getByLabelText('Cantidad'), {
            target: { value: '2' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'Agregar medicamento' }),
        );
        fillItem(1, 'Ibuprofeno', 'Si hay dolor');
        fireEvent.click(screen.getByRole('button', { name: 'Emitir receta' }));

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/42/prescriptions',
                {
                    diagnosis: 'Faringitis',
                    items: [
                        {
                            medication: 'Amoxicilina',
                            presentation: 'Comprimidos 500 mg',
                            dosage: '1 cada 8 h',
                            quantity: 2,
                        },
                        {
                            medication: 'Ibuprofeno',
                            presentation: null,
                            dosage: 'Si hay dolor',
                            quantity: 1,
                        },
                    ],
                },
            ),
        );
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    });

    it('does not submit an item without medication or dosage', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        renderDialog();

        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByRole('button', { name: 'Emitir receta' }));

        await screen.findByText('Indicá el medicamento.');
        expect(screen.getByText('Indicá la posología.')).toBeTruthy();
        expect(api.post).not.toHaveBeenCalled();
    });

    it('does not submit a quantity lower than 1', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        renderDialog();

        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

        fillItem(0, 'Amoxicilina', '1 cada 8 h');
        fireEvent.change(screen.getByLabelText('Cantidad'), {
            target: { value: '0' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Emitir receta' }));

        await screen.findByText('La cantidad debe estar entre 1 y 999.');
        expect(api.post).not.toHaveBeenCalled();
    });

    it('shows a server validation error inline on the offending item field', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 422,
                data: {
                    message: 'Datos inválidos.',
                    errors: {
                        'items.0.medication': ['Medicamento rechazado.'],
                    },
                },
            },
        });
        renderDialog();

        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

        fillItem(0, 'Amoxicilina', '1 cada 8 h');
        fireEvent.click(screen.getByRole('button', { name: 'Emitir receta' }));

        await screen.findByText('Medicamento rechazado.');
    });

    it('editing prefills the form and sends a PATCH with the edited items', async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: { data: [buildPrescription({ id: 7 })] },
        });
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await screen.findByText('Amoxicilina × 2');
        fireEvent.click(screen.getByRole('button', { name: 'Editar' }));

        const medication = screen.getByLabelText(
            'Medicamento',
        ) as HTMLInputElement;
        await waitFor(() => expect(medication.value).toBe('Amoxicilina'));

        fireEvent.change(medication, { target: { value: 'Cefalexina' } });
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar cambios' }),
        );

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/prescriptions/7', {
                diagnosis: 'Faringitis',
                items: [
                    {
                        medication: 'Cefalexina',
                        presentation: 'Comprimidos 500 mg',
                        dosage: '1 cada 8 h por 7 días',
                        quantity: 2,
                    },
                ],
            }),
        );
    });

    it.each(['expired', 'cancelled'] as const)(
        'while the subscription is %s it keeps the print link but hides the form and the edit action',
        async (status) => {
            vi.mocked(api.get).mockResolvedValue({
                data: { data: [buildPrescription()] },
            });
            renderDialog(true, buildSubscription(status));

            await screen.findByText('Amoxicilina × 2');
            expect(screen.getByRole('link', { name: 'Imprimir' })).toBeTruthy();
            expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
            expect(
                screen.queryByRole('button', { name: 'Emitir receta' }),
            ).toBeNull();
            expect(screen.queryByLabelText('Medicamento')).toBeNull();
        },
    );
});
