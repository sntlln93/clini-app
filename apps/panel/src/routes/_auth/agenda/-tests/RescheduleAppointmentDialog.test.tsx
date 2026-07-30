import { api } from '@/lib/api';
import type { Appointment } from '@/types/appointment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RescheduleAppointmentDialog } from '../-components/RescheduleAppointmentDialog';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

function overlapError() {
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
    id: 7,
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

function renderDialog(appointment: Appointment | null = APPOINTMENT) {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <RescheduleAppointmentDialog
                open
                onOpenChange={() => {}}
                appointment={appointment}
            />
        </QueryClientProvider>,
    );
}

describe('RescheduleAppointmentDialog', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
    });

    it('submits the chosen start_at to the reschedule endpoint for the appointment id', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        fireEvent.change(screen.getByLabelText('Fecha'), {
            target: { value: '2026-08-10' },
        });
        fireEvent.change(screen.getByLabelText('Hora'), {
            target: { value: '14:30' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Reprogramar' }));

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
        expect(api.post).toHaveBeenCalledWith('/appointments/7/reschedule', {
            start_at: '2026-08-10T14:30',
            reason: null,
            notes: null,
        });
    });

    it('surfaces the slot-taken domain error inline on the time field', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(overlapError());
        renderDialog();

        fireEvent.change(screen.getByLabelText('Fecha'), {
            target: { value: '2026-08-10' },
        });
        fireEvent.change(screen.getByLabelText('Hora'), {
            target: { value: '14:30' },
        });

        fireEvent.click(screen.getByRole('button', { name: 'Reprogramar' }));

        await screen.findByText(
            'El profesional ya tiene un turno en ese horario.',
        );
    });
});
