import { api } from '@/lib/api';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentCard } from '../-components/AppointmentCard';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
    return {
        id: 1,
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
        patient_name: 'Juan Pérez',
        service_name: 'Consulta general',
        ...overrides,
    };
}

function renderCard(appointment: Appointment, canUpdate: boolean = true) {
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <AppointmentCard appointment={appointment} canUpdate={canUpdate} />
        </QueryClientProvider>,
    );
}

describe('AppointmentCard', () => {
    beforeEach(() => {
        vi.mocked(api.patch).mockReset();
    });

    it('lists Cancelar and Reprogramar alongside the status transitions for a scheduled appointment', async () => {
        renderCard(buildAppointment({ status: 'scheduled' }));

        fireEvent.click(screen.getByRole('button'));

        expect(
            await screen.findByRole('menuitem', { name: 'Cancelar' }),
        ).toBeTruthy();
        expect(
            screen.getByRole('menuitem', { name: 'Reprogramar' }),
        ).toBeTruthy();
        expect(
            screen.getByRole('menuitem', { name: 'Confirmado' }),
        ).toBeTruthy();
        expect(screen.getByRole('menuitem', { name: 'Ausente' })).toBeTruthy();
    });

    it('shows Cancelar but not Reprogramar for an arrived appointment', async () => {
        renderCard(buildAppointment({ status: 'arrived' }));

        fireEvent.click(screen.getByRole('button'));

        expect(
            await screen.findByRole('menuitem', { name: 'Cancelar' }),
        ).toBeTruthy();
        expect(
            screen.queryByRole('menuitem', { name: 'Reprogramar' }),
        ).toBeNull();
    });

    it.each<AppointmentStatus>(['completed', 'cancelled'])(
        'renders no dropdown menu for a %s appointment',
        (status) => {
            renderCard(buildAppointment({ status }));

            expect(screen.queryByRole('button')).toBeNull();
            expect(screen.getByText('Juan Pérez')).toBeTruthy();
        },
    );

    it('renders no menu when canUpdate is false, even for an otherwise actionable status', () => {
        renderCard(buildAppointment({ status: 'scheduled' }), false);

        expect(screen.queryByRole('button')).toBeNull();
        expect(screen.getByText('Juan Pérez')).toBeTruthy();
    });

    it('clicking Cancelar opens a confirmation and only cancels once confirmed', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderCard(buildAppointment({ id: 42, status: 'scheduled' }));

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(
            await screen.findByRole('menuitem', { name: 'Cancelar' }),
        );

        expect(api.patch).not.toHaveBeenCalled();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Confirmar' }),
        );

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/appointments/42/cancel', {
                cancellation_reason: null,
            }),
        );
    });
});
