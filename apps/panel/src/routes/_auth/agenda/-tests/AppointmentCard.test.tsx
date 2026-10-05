import { api } from '@/lib/api';
import { sessionQueryOptions } from '@/lib/session';
import { notifyError, notifySuccess } from '@/lib/toast';
import type { Appointment, AppointmentStatus } from '@/types/appointment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentCard } from '../-components/AppointmentCard';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

const invalidate = vi.fn();
const navigate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate, navigate }) };
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
        arrived_at: null,
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
    permissions: string[] = [],
) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    if (sessionMembershipId !== undefined) {
        queryClient.setQueryData(sessionQueryOptions.queryKey, {
            id: 1,
            name: 'Ana Ejemplo',
            email: 'ana@clini.app',
            permissions,
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
        vi.mocked(notifySuccess).mockReset();
        vi.mocked(notifyError).mockReset();
        vi.mocked(api.patch).mockReset();
        vi.mocked(api.get).mockReset();
        invalidate.mockReset();
        navigate.mockReset();
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
            screen.getByRole('menuitem', { name: 'Confirmar turno' }),
        ).toBeTruthy();
        expect(
            screen.getByRole('menuitem', { name: 'Marcar ausente' }),
        ).toBeTruthy();
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

    it.each([
        ['scheduled', 'bg-status-scheduled-wash', 'Agendado'],
        ['confirmed', 'bg-status-confirmed-wash', 'Confirmado'],
        ['arrived', 'bg-status-arrived-wash', 'Llegó'],
        ['completed', 'bg-status-completed-wash', 'Completado'],
        ['no_show', 'bg-status-no-show-wash', 'Ausente'],
    ] as const)(
        'paints a %s appointment with its status token in both views',
        (status, washClass, label) => {
            for (const variant of ['day', 'default'] as const) {
                const { unmount } = render(
                    <QueryClientProvider client={new QueryClient()}>
                        <AppointmentCard
                            appointment={buildAppointment({ status })}
                            canUpdate={false}
                            variant={variant}
                            compact={false}
                        />
                    </QueryClientProvider>,
                );
                const block = screen
                    .getByText('Juan Pérez')
                    .closest('[data-status]');
                expect(block?.className).toContain(washClass);
                expect(block?.className).toContain('border-l-[3px]');
                expect(screen.getByText(label)).toBeTruthy();
                unmount();
            }
        },
    );

    it.each(['cancelled', 'rescheduled'] as const)(
        'shows a %s appointment in gray with its label and patient struck through',
        (status) => {
            renderCard(buildAppointment({ status }), false, 'day');

            const patient = screen.getByText('Juan Pérez');
            expect(patient.className).toContain('line-through');
            expect(patient.closest('[data-status]')?.className).toContain(
                'bg-status-scheduled-wash',
            );
            const label = screen.getByText(
                status === 'cancelled' ? 'Cancelado' : 'Reprogramado',
            );
            expect(label.className).toContain('line-through');
        },
    );

    it('marks an online booking next to its status, and only online ones', () => {
        renderCard(buildAppointment({ origin: 'online' }), false, 'day');
        expect(
            screen.getByRole('img', { name: 'Reserva online' }),
        ).toBeTruthy();
        expect(screen.getByText('Agendado')).toBeTruthy();
    });

    it('shows no online mark for an appointment loaded by the practice', () => {
        renderCard(buildAppointment({ origin: 'manual' }), false, 'day');
        expect(
            screen.queryByRole('img', { name: 'Reserva online' }),
        ).toBeNull();
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

    it("shows the Ver ficha del paciente item, navigating to the patient's detail route, for the appointment's own professional with patients.view", async () => {
        renderCard(
            buildAppointment({
                id: 1,
                status: 'completed',
                membership_id: 1,
                patient_id: 50,
            }),
            true,
            'default',
            false,
            1,
            ['patients.view'],
        );

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(
            await screen.findByRole('menuitem', {
                name: 'Ver ficha del paciente',
            }),
        );

        expect(navigate).toHaveBeenCalledWith({
            to: '/pacientes/$id',
            params: { id: 50 },
        });
    });

    it('renders a static card for a different membership without patients.view and no update actions', () => {
        renderCard(
            buildAppointment({ id: 1, status: 'completed', membership_id: 1 }),
            true,
            'default',
            false,
            2,
        );

        expect(screen.queryByRole('button')).toBeNull();
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

    it('does not offer Recetas to a different membership', async () => {
        renderCard(
            buildAppointment({ status: 'scheduled', membership_id: 1 }),
            true,
            'default',
            false,
            2,
        );

        fireEvent.click(screen.getByRole('button'));

        expect(
            await screen.findByRole('menuitem', { name: 'Cancelar' }),
        ).toBeTruthy();
        expect(screen.queryByRole('menuitem', { name: 'Recetas' })).toBeNull();
    });

    it('clicking Recetas opens the prescriptions dialog', async () => {
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
            await screen.findByRole('menuitem', { name: 'Recetas' }),
        );

        await waitFor(() =>
            expect(api.get).toHaveBeenCalledWith(
                '/appointments/1/prescriptions',
            ),
        );
        expect(
            await screen.findByText(
                'Todavía no emitiste recetas para este turno.',
            ),
        ).toBeTruthy();
    });

    it('applies a non-destructive status change straight from the menu and confirms it with a toast', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderCard(buildAppointment({ id: 9, status: 'scheduled' }));

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(
            await screen.findByRole('menuitem', { name: 'Confirmar turno' }),
        );

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/appointments/9/status', {
                status: 'confirmed',
            }),
        );
        await waitFor(() =>
            expect(notifySuccess).toHaveBeenCalledWith('Turno confirmado.'),
        );
    });

    it('surfaces a rejected status change as an error toast', async () => {
        vi.mocked(api.patch).mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 500 },
        });
        renderCard(buildAppointment({ id: 9, status: 'confirmed' }));

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(
            await screen.findByRole('menuitem', { name: 'Marcar llegada' }),
        );

        await waitFor(() =>
            expect(notifyError).toHaveBeenCalledWith(
                expect.anything(),
                'No se pudo actualizar el estado del turno.',
            ),
        );
        expect(notifySuccess).not.toHaveBeenCalled();
    });

    it('asks for confirmation before marking a patient as absent', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        renderCard(buildAppointment({ id: 9, status: 'scheduled' }));

        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(
            await screen.findByRole('menuitem', { name: 'Marcar ausente' }),
        );

        expect(
            await screen.findByText('¿Marcar al paciente como ausente?'),
        ).toBeTruthy();
        expect(api.patch).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Marcar ausente' }));

        await waitFor(() =>
            expect(api.patch).toHaveBeenCalledWith('/appointments/9/status', {
                status: 'no_show',
            }),
        );
    });

    it("offers staff with patients.view the patient record but not the professional's notes or prescriptions", async () => {
        renderCard(
            buildAppointment({ status: 'scheduled', membership_id: 1 }),
            true,
            'default',
            false,
            2,
            ['patients.view'],
        );

        fireEvent.click(screen.getByRole('button'));

        expect(
            await screen.findByRole('menuitem', {
                name: 'Ver ficha del paciente',
            }),
        ).toBeTruthy();
        expect(
            screen.queryByRole('menuitem', { name: 'Notas clínicas' }),
        ).toBeNull();
        expect(screen.queryByRole('menuitem', { name: 'Recetas' })).toBeNull();
    });

    it('keeps a completed appointment clickable for staff with patients.view, offering just the patient record', async () => {
        renderCard(
            buildAppointment({ status: 'completed', membership_id: 1 }),
            false,
            'default',
            false,
            2,
            ['patients.view'],
        );

        fireEvent.click(screen.getByRole('button'));

        expect(
            await screen.findByRole('menuitem', {
                name: 'Ver ficha del paciente',
            }),
        ).toBeTruthy();
        expect(screen.getAllByRole('menuitem')).toHaveLength(1);
    });

    it('does not offer the patient record to the own professional without patients.view', async () => {
        renderCard(
            buildAppointment({ status: 'completed', membership_id: 1 }),
            false,
            'default',
            false,
            1,
        );

        fireEvent.click(screen.getByRole('button'));

        expect(
            await screen.findByRole('menuitem', { name: 'Notas clínicas' }),
        ).toBeTruthy();
        expect(
            screen.queryByRole('menuitem', { name: 'Ver ficha del paciente' }),
        ).toBeNull();
    });
});
