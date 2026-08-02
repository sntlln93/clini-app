import { api } from '@/lib/api';
import type { Appointment } from '@/types/appointment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancelAppointmentDialog } from '../-components/CancelAppointmentDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

function domainError() {
    return {
        isAxiosError: true,
        response: {
            status: 409,
            data: {
                error: {
                    code: 'appointments.slot_taken',
                    message:
                        'The professional already has an appointment at that time.',
                    context: {},
                },
            },
        },
    };
}

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
};

function renderDialog(onOpenChange: (open: boolean) => void = () => {}) {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <CancelAppointmentDialog
                open
                onOpenChange={onOpenChange}
                appointment={APPOINTMENT}
            />
        </QueryClientProvider>,
    );
}

describe('CancelAppointmentDialog', () => {
    beforeEach(() => {
        vi.mocked(api.patch).mockReset();
    });

    it('confirming with no reason sends a null cancellation_reason and closes the dialog', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        const onOpenChange = vi.fn();
        renderDialog(onOpenChange);

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar turno' }));

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/appointments/42/cancel', {
                cancellation_reason: null,
            }),
        );
        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    });

    it('trims a hand-typed reason before sending it', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderDialog();

        fireEvent.change(screen.getByLabelText('Motivo (opcional)'), {
            target: { value: '  El paciente pidió reprogramar  ' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar turno' }));

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/appointments/42/cancel', {
                cancellation_reason: 'El paciente pidió reprogramar',
            }),
        );
    });

    it('a quick reply fills the input and stays editable, sending the edited text', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderDialog();

        fireEvent.click(
            screen.getByRole('button', { name: 'El paciente canceló' }),
        );

        const input = screen.getByLabelText(
            'Motivo (opcional)',
        ) as HTMLInputElement;
        expect(input.value).toBe('El paciente canceló');

        fireEvent.change(input, {
            target: { value: 'El paciente canceló y luego reprogramó' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar turno' }));

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/appointments/42/cancel', {
                cancellation_reason: 'El paciente canceló y luego reprogramó',
            }),
        );
    });

    it('clicking Volver does not trigger the mutation and closes the dialog', () => {
        const onOpenChange = vi.fn();
        renderDialog(onOpenChange);

        fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

        expect(api.patch).not.toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('shows a server domain error inline and does not close the dialog', async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(domainError());
        const onOpenChange = vi.fn();
        renderDialog(onOpenChange);

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar turno' }));

        await screen.findByText(
            'El profesional ya tiene un turno en ese horario.',
        );
        expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });

    it('a reason over 255 characters does not trigger the mutation and shows the zod validation message', async () => {
        renderDialog();

        fireEvent.change(screen.getByLabelText('Motivo (opcional)'), {
            target: { value: 'a'.repeat(256) },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Cancelar turno' }));

        await screen.findByText(
            'El motivo no puede superar los 255 caracteres.',
        );
        expect(api.patch).not.toHaveBeenCalled();
    });
});
