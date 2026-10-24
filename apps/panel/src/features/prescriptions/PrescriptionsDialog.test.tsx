import { api } from '@/lib/api';
import { planQueryOptions } from '@/lib/plan';
import { subscriptionQueryOptions } from '@/lib/subscription';
import { buildPlan } from '@/tests/fixtures/plan';
import { AMOXICILLIN, buildPrescription } from '@/tests/fixtures/prescription';
import { buildSubscription } from '@/tests/fixtures/subscription';
import type { Appointment } from '@/types/appointment';
import type { Plan } from '@/types/plan';
import type { Subscription } from '@/types/subscription';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterProvider,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrescriptionsDialog } from './PrescriptionsDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
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
    reported_insurance_provider_id: null,
    reported_insurance_member_number: null,
    arrived_at: null,
};

function renderDialog(
    open: boolean = true,
    subscription?: Subscription,
    plan?: Plan,
    props: Partial<ComponentProps<typeof PrescriptionsDialog>> = {},
) {
    const queryClient = new QueryClient();
    if (plan) {
        queryClient.setQueryData(planQueryOptions.queryKey, plan);
    }
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
                    {...props}
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
    });

    // Nothing prints the record anymore (#319).
    it("lists the appointment's indicated medication, with no print link", async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: { data: [buildPrescription()] },
        });
        renderDialog();

        await screen.findByText('Amoxicilina × 2');
        expect(api.get).toHaveBeenCalledWith('/appointments/42/prescriptions');
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.queryByText(/receta/i)).toBeNull();
    });

    it('makes no request while the dialog is closed', () => {
        renderDialog(false);

        expect(api.get).not.toHaveBeenCalled();
    });

    it('starts with one item row that cannot be removed, and adds/removes rows', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        renderDialog();

        await screen.findByText(
            'Todavía no registraste medicación en este turno.',
        );
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

    it('recording posts every item, with no diagnosis, then refetches the list', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

        expect(screen.queryByLabelText(/Diagnóstico/)).toBeNull();
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
        fireEvent.click(
            screen.getByRole('button', { name: 'Registrar medicación' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/42/prescriptions',
                {
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

        fireEvent.click(
            screen.getByRole('button', { name: 'Registrar medicación' }),
        );

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
        fireEvent.click(
            screen.getByRole('button', { name: 'Registrar medicación' }),
        );

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
        fireEvent.click(
            screen.getByRole('button', { name: 'Registrar medicación' }),
        );

        await screen.findByText('Medicamento rechazado.');
    });

    it('amending prefills the form and posts the corrected items and the reason as an amendment', async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: { data: [buildPrescription({ id: 7 })] },
        });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await screen.findByText('Amoxicilina × 2');
        expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Enmendar' }));

        const medication = screen.getByLabelText(
            'Medicamento',
        ) as HTMLInputElement;
        await waitFor(() => expect(medication.value).toBe('Amoxicilina'));

        fireEvent.change(medication, { target: { value: 'Cefalexina' } });
        fireEvent.change(
            screen.getByLabelText('Motivo de la enmienda (opcional)'),
            { target: { value: 'Alergia a la penicilina.' } },
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar enmienda' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/prescriptions/7/amendments',
                {
                    items: [
                        {
                            medication: 'Cefalexina',
                            presentation: 'Comprimidos 500 mg',
                            dosage: '1 cada 8 h por 7 días',
                            quantity: 2,
                        },
                    ],
                    reason: 'Alergia a la penicilina.',
                },
            ),
        );
    });

    it('an amended record lists every version with its reason', async () => {
        const cefalexin = { ...AMOXICILLIN, id: 2, medication: 'Cefalexina' };
        vi.mocked(api.get).mockResolvedValue({
            data: {
                data: [
                    buildPrescription({
                        version: 2,
                        amended_at: '2026-08-03T11:00:00Z',
                        items: [cefalexin],
                        versions: [
                            {
                                version: 1,
                                reason: null,
                                created_at: '2026-08-03T10:15:00Z',
                                items: [AMOXICILLIN],
                            },
                            {
                                version: 2,
                                reason: 'Alergia a la penicilina.',
                                created_at: '2026-08-03T11:00:00Z',
                                items: [cefalexin],
                            },
                        ],
                    }),
                ],
            },
        });
        renderDialog();

        await screen.findByText('Cefalexina × 2');
        expect(screen.getByText(/Ver las 2 versiones/)).toBeTruthy();
        expect(
            screen.getByText('Motivo: Alergia a la penicilina.'),
        ).toBeTruthy();
        expect(screen.getByText(/^Amoxicilina/)).toBeTruthy();
    });

    it.each(['expired'] as const)(
        'while the subscription is %s it keeps the list but hides the form and the amend action',
        async (status) => {
            vi.mocked(api.get).mockResolvedValue({
                data: { data: [buildPrescription()] },
            });
            renderDialog(true, buildSubscription(status));

            await screen.findByText('Amoxicilina × 2');
            expect(
                screen.queryByRole('button', { name: 'Enmendar' }),
            ).toBeNull();
            expect(
                screen.queryByRole('button', { name: 'Registrar medicación' }),
            ).toBeNull();
            expect(screen.queryByLabelText('Medicamento')).toBeNull();
        },
    );

    it("on a plan without prescriptions it keeps the list, explains why it can't record them and hides the form", async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: { data: [buildPrescription()] },
        });
        renderDialog(true, undefined, buildPlan('free'));

        await screen.findByText('Amoxicilina × 2');
        expect(screen.queryByRole('button', { name: 'Enmendar' })).toBeNull();
        expect(screen.queryByLabelText('Medicamento')).toBeNull();
        expect(
            screen.getByText(
                /Registrar la medicación indicada es parte del plan\s+Consultorio/,
            ),
        ).toBeTruthy();
        expect(
            screen
                .getByRole('link', { name: 'Ver planes' })
                .getAttribute('href'),
        ).toBe('/ajustes#suscripcion');
    });

    // The patient page's «Enmendar»: straight on that record, no new one.
    it('amendOnOpen opens on amending that record, and saving calls onSaved and leaves no new-record form', async () => {
        const prescription = buildPrescription({ id: 7 });
        vi.mocked(api.get).mockResolvedValue({
            data: { data: [prescription] },
        });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const onSaved = vi.fn();
        renderDialog(true, undefined, undefined, {
            amendOnOpen: prescription,
            allowCreate: false,
            onSaved,
        });

        const medication = (await screen.findByLabelText(
            'Medicamento',
        )) as HTMLInputElement;
        await waitFor(() => expect(medication.value).toBe('Amoxicilina'));
        fireEvent.click(
            screen.getByRole('button', { name: 'Guardar enmienda' }),
        );

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
        expect(api.post).toHaveBeenCalledWith(
            '/prescriptions/7/amendments',
            expect.objectContaining({ reason: null }),
        );
        await waitFor(() =>
            expect(screen.queryByLabelText('Medicamento')).toBeNull(),
        );
        expect(
            screen.queryByRole('button', { name: 'Registrar medicación' }),
        ).toBeNull();
    });

    it('without allowCreate, cancelling the amendment leaves no new-record form', async () => {
        const prescription = buildPrescription({ id: 7 });
        vi.mocked(api.get).mockResolvedValue({
            data: { data: [prescription] },
        });
        renderDialog(true, undefined, undefined, {
            amendOnOpen: prescription,
            allowCreate: false,
        });

        fireEvent.click(
            await screen.findByRole('button', { name: 'Cancelar enmienda' }),
        );

        expect(screen.getByText('Amoxicilina × 2')).toBeTruthy();
        expect(screen.queryByLabelText('Medicamento')).toBeNull();
        expect(
            screen.queryByRole('button', { name: 'Registrar medicación' }),
        ).toBeNull();
    });

    it('a new record calls onSaved too', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const onSaved = vi.fn();
        renderDialog(true, undefined, undefined, { onSaved });

        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
        fillItem(0, 'Amoxicilina', '1 cada 8 h');
        fireEvent.click(
            screen.getByRole('button', { name: 'Registrar medicación' }),
        );

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    });
});
