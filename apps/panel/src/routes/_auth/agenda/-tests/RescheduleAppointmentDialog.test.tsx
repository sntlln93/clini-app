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
    arrived_at: null,
    patient_name: 'Juan Pérez',
    professional_name: 'Dra. Ana López',
};

// Monday 2026-08-10 (day_of_week 1), 09:00–18:00 — covers the 14:30 reschedule target.
const MONDAY_AVAILABILITY = {
    id: 1,
    membership_id: 1,
    day_of_week: 1,
    start_time: '09:00:00',
    end_time: '18:00:00',
};

function mockAvailability(availabilities: unknown[] = [MONDAY_AVAILABILITY]) {
    vi.mocked(api.get).mockImplementation((url: string) =>
        Promise.resolve({
            data: {
                data: url.includes('/availabilities') ? availabilities : [],
            },
        }),
    );
}

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
        vi.mocked(api.get).mockReset();
        mockAvailability();
    });

    async function chooseSlot(date: string, time: string) {
        // Submit stays disabled until availability has loaded.
        await waitFor(() =>
            expect(
                (
                    screen.getByRole('button', {
                        name: 'Reprogramar',
                    }) as HTMLButtonElement
                ).disabled,
            ).toBe(false),
        );
        fireEvent.change(screen.getByLabelText('Fecha'), {
            target: { value: date },
        });
        fireEvent.change(screen.getByLabelText('Hora'), {
            target: { value: time },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Reprogramar' }));
    }

    it('names the appointment it acts on: patient, professional and local start time', () => {
        renderDialog();

        expect(
            screen.getByText(
                /Turno de Juan Pérez con Dra\. Ana López · lun 3 ago, 10:00\. Elegí el nuevo horario\./,
            ),
        ).toBeTruthy();
    });

    it('prefills a late-evening appointment with its local date, not the next UTC day', async () => {
        // 22:30 in Buenos Aires is already 01:30Z on the next day.
        renderDialog({ ...APPOINTMENT, start_at: '2026-08-04T01:30:00.000Z' });

        await waitFor(() =>
            expect(
                (screen.getByLabelText('Fecha') as HTMLInputElement).value,
            ).toBe('2026-08-03'),
        );
        expect((screen.getByLabelText('Hora') as HTMLInputElement).value).toBe(
            '22:30',
        );
    });

    it('warns before rescheduling outside the professional availability, and submits on confirm', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await chooseSlot('2026-08-10', '20:00');

        expect(
            await screen.findByText(
                '¿Querés registrar el turno fuera del horario disponible del profesional?',
            ),
        ).toBeTruthy();
        expect(api.post).not.toHaveBeenCalled();

        fireEvent.click(
            screen.getByRole('button', { name: 'Reprogramar de todos modos' }),
        );

        await waitFor(() =>
            expect(api.post).toHaveBeenCalledWith(
                '/appointments/7/reschedule',
                {
                    start_at: '2026-08-10T23:00:00.000Z',
                    reason: null,
                    notes: null,
                },
            ),
        );
    });

    it('submits the chosen local start time as a UTC instant to the reschedule endpoint', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        renderDialog();

        await chooseSlot('2026-08-10', '14:30');

        await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
        expect(api.post).toHaveBeenCalledWith('/appointments/7/reschedule', {
            start_at: '2026-08-10T17:30:00.000Z',
            reason: null,
            notes: null,
        });
    });

    it('surfaces the slot-taken domain error inline on the time field', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(overlapError());
        renderDialog();

        await chooseSlot('2026-08-10', '14:30');

        await screen.findByText(
            'El profesional ya tiene un turno en ese horario.',
        );
    });
});
