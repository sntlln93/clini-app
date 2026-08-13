import { api } from '@/lib/api';
import { sessionQueryOptions } from '@/lib/session';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentCard } from '../-components/AppointmentCard';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

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

// Undefined leaves the session query unseeded (no active membership resolves),
// matching the pre-existing behavior every case above this line already relies on.
function renderCard(
    appointment: Appointment,
    canUpdate: boolean = true,
    variant: 'default' | 'day' = 'default',
    compact: boolean = false,
    sessionMembershipId?: number,
) {
    const queryClient = new QueryClient();
    if (sessionMembershipId !== undefined) {
        queryClient.setQueryData(sessionQueryOptions.queryKey, {
            id: 1,
            name: 'Ana Ejemplo',
            email: 'ana@clini.app',
            membership: {
                id: sessionMembershipId,
                user: { id: 1, name: 'Ana Ejemplo', email: 'ana@clini.app' },
                roles: ['professional'],
                status: 'active',
                slug: null,
                deleted_at: null,
                created_at: '2026-01-01T00:00:00',
                updated_at: '2026-01-01T00:00:00',
            },
        });
    }
    render(
        <QueryClientProvider client={queryClient}>
            <AppointmentCard
                appointment={appointment}
                canUpdate={canUpdate}
                variant={variant}
                compact={compact}
            />
        </QueryClientProvider>,
    );
}

describe('AppointmentCard', () => {
    beforeEach(() => {
        vi.mocked(api.patch).mockReset();
        vi.mocked(api.get).mockReset();
        invalidate.mockReset();
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

    it('clicking Cancelar opens the cancellation dialog and only cancels once confirmed', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderCard(buildAppointment({ id: 42, status: 'scheduled' }));

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(
            await screen.findByRole('menuitem', { name: 'Cancelar' }),
        );

        expect(api.patch).not.toHaveBeenCalled();

        fireEvent.click(
            await screen.findByRole('button', { name: 'Cancelar turno' }),
        );

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/appointments/42/cancel', {
                cancellation_reason: null,
            }),
        );
        await waitFor(() => expect(invalidate).toHaveBeenCalled());
    });

    it('renders the time in the original long es-AR format for the default variant (week view)', () => {
        const appointment = buildAppointment();
        renderCard(appointment);

        const expectedStart = new Date(appointment.start_at).toLocaleTimeString(
            'es-AR',
            { hour: '2-digit', minute: '2-digit' },
        );
        const expectedEnd = new Date(appointment.end_at).toLocaleTimeString(
            'es-AR',
            { hour: '2-digit', minute: '2-digit' },
        );

        expect(
            screen.getByText(`${expectedStart}–${expectedEnd}`),
        ).toBeTruthy();
    });

    it('renders the time in short 24-hour form in a single element for the day variant', () => {
        renderCard(buildAppointment(), true, 'day');

        expect(screen.getByText('10:00–10:30')).toBeTruthy();
    });

    it('hides the service line in compact day mode but keeps time, patient and status', () => {
        renderCard(buildAppointment(), true, 'day', true);

        expect(screen.getByText('10:00–10:30')).toBeTruthy();
        expect(screen.getByText('Juan Pérez')).toBeTruthy();
        expect(screen.getByText('Agendado')).toBeTruthy();
        expect(screen.queryByText('Consulta general')).toBeNull();
    });

    it('shows the service line in non-compact day mode', () => {
        renderCard(buildAppointment(), true, 'day', false);

        expect(screen.getByText('Consulta general')).toBeTruthy();
    });

    it("shows the Notas clínicas item when the session membership is the appointment's professional", async () => {
        renderCard(
            buildAppointment({ id: 1, status: 'completed', membership_id: 1 }),
            true,
            'default',
            false,
            1,
        );

        fireEvent.click(screen.getByRole('button'));

        expect(
            await screen.findByRole('menuitem', { name: 'Notas clínicas' }),
        ).toBeTruthy();
    });

    it('does not show the Notas clínicas item when the session membership is a different membership', () => {
        renderCard(
            buildAppointment({ id: 1, status: 'completed', membership_id: 1 }),
            true,
            'default',
            false,
            2,
        );

        expect(screen.queryByRole('button')).toBeNull();
    });

    it('still renders a menu with only Notas clínicas when canUpdate is false and no status transitions apply, for its own professional', async () => {
        renderCard(
            buildAppointment({ id: 1, status: 'completed', membership_id: 1 }),
            false,
            'default',
            false,
            1,
        );

        fireEvent.click(screen.getByRole('button'));

        expect(
            await screen.findByRole('menuitem', { name: 'Notas clínicas' }),
        ).toBeTruthy();
        expect(screen.queryByRole('menuitem', { name: 'Cancelar' })).toBeNull();
        expect(
            screen.queryByRole('menuitem', { name: 'Reprogramar' }),
        ).toBeNull();
    });

    it('clicking Notas clínicas opens the clinical notes dialog', async () => {
        vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [] } });
        renderCard(
            buildAppointment({ id: 1, status: 'completed', membership_id: 1 }),
            true,
            'default',
            false,
            1,
        );

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(
            await screen.findByRole('menuitem', { name: 'Notas clínicas' }),
        );

        await waitFor(() =>
            expect(api.get).toHaveBeenCalledWith(
                '/appointments/1/clinical-notes',
            ),
        );
        expect(
            await screen.findByText(
                'Solo vos podés ver y editar tus notas de este turno.',
            ),
        ).toBeTruthy();
    });
});
