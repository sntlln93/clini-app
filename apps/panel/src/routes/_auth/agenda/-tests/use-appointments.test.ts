import { api } from '@/lib/api';
import { planQueryOptions } from '@/lib/plan';
import { notifySuccess } from '@/lib/toast';
import { buildPlan } from '@/tests/fixtures/plan';
import type { Plan } from '@/types/plan';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useCancelAppointment,
    useCreateAppointment,
    useRescheduleAppointment,
} from '../-hooks/use-appointments';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

const invalidate = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

function renderWithClient<T>(hook: () => T, plan?: Plan) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    if (plan) {
        queryClient.setQueryData(planQueryOptions.queryKey, plan);
    }
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(hook, { wrapper });

    return { result, invalidateQueries };
}

const renderUseCreateAppointment = () => renderWithClient(useCreateAppointment);

const PAYLOAD = {
    membershipId: 1,
    patientId: 2,
    serviceId: 3,
    startAt: '2026-01-15T13:00:00.000Z',
    reason: null,
    notes: null,
};

describe('useCreateAppointment', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(notifySuccess).mockReset();
        invalidate.mockClear();
    });

    it('confirms the booking with its local date and time in a success toast', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { result } = renderUseCreateAppointment();

        // 13:00Z is 10:00 in Buenos Aires (the suite's TZ).
        await result.current.mutateAsync(PAYLOAD);

        expect(notifySuccess).toHaveBeenCalledWith(
            'Turno creado para el jueves 15 de enero a las 10:00.',
        );
    });

    it('invalidates the router on success', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { result } = renderUseCreateAppointment();

        await result.current.mutateAsync(PAYLOAD);

        expect(invalidate).toHaveBeenCalledTimes(1);
    });

    it('invalidates the appointments query key on success', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { result, invalidateQueries } = renderUseCreateAppointment();

        await result.current.mutateAsync(PAYLOAD);

        expect(invalidateQueries).toHaveBeenCalledWith({
            queryKey: ['appointments'],
            refetchType: 'all',
        });
    });

    it('does not invalidate anything when the mutation fails', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 500 },
        });
        const { result, invalidateQueries } = renderUseCreateAppointment();

        await result.current.mutateAsync(PAYLOAD).catch(() => {});

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(invalidate).not.toHaveBeenCalled();
        expect(invalidateQueries).not.toHaveBeenCalled();
    });
});

describe('useRescheduleAppointment / useCancelAppointment', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(api.patch).mockReset();
        vi.mocked(notifySuccess).mockReset();
    });

    it('confirms a reschedule with the new local date and time', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { result } = renderWithClient(useRescheduleAppointment);

        await result.current.mutateAsync({
            appointmentId: 7,
            startAt: '2026-08-10T17:30:00.000Z',
        });

        expect(notifySuccess).toHaveBeenCalledWith(
            'Turno reprogramado para el lunes 10 de agosto a las 14:30.',
        );
    });

    it('confirms a cancellation', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        const { result } = renderWithClient(useCancelAppointment);

        await result.current.mutateAsync({ appointmentId: 7 });

        expect(notifySuccess).toHaveBeenCalledWith('Turno cancelado.');
    });

    it('does not toast success when the reschedule fails', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 500 },
        });
        const { result } = renderWithClient(useRescheduleAppointment);

        await result.current
            .mutateAsync({ appointmentId: 7, startAt: '2026-08-10T17:30:00Z' })
            .catch(() => {});

        expect(notifySuccess).not.toHaveBeenCalled();
    });
});

describe("on Free, which counts the month's appointments (#238)", () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(api.patch).mockReset();
    });

    it('refreshes the plan after creating, rescheduling or cancelling an appointment', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: {} });
        vi.mocked(api.patch).mockResolvedValue({ data: {} });
        const free = buildPlan('free');
        const create = renderWithClient(useCreateAppointment, free);
        const reschedule = renderWithClient(useRescheduleAppointment, free);
        const cancel = renderWithClient(useCancelAppointment, free);

        await create.result.current.mutateAsync(PAYLOAD);
        await reschedule.result.current.mutateAsync({
            appointmentId: 7,
            startAt: '2026-08-10T17:30:00.000Z',
        });
        await cancel.result.current.mutateAsync({ appointmentId: 7 });

        for (const { invalidateQueries } of [create, reschedule, cancel]) {
            expect(invalidateQueries).toHaveBeenCalledWith({
                queryKey: ['plan'],
                refetchType: 'all',
            });
        }
    });

    it('refreshes the plan when the server says the month is full, so the banner catches up', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'plans.appointment_limit_reached',
                        message: 'Internal message.',
                        context: { appointment_limit: 40, month: '2026-01' },
                    },
                },
            },
        });
        const { result, invalidateQueries } = renderWithClient(
            useCreateAppointment,
            buildPlan('free'),
        );

        await result.current.mutateAsync(PAYLOAD).catch(() => {});

        await waitFor(() =>
            expect(invalidateQueries).toHaveBeenCalledWith({
                queryKey: ['plan'],
                refetchType: 'all',
            }),
        );
        expect(invalidate).not.toHaveBeenCalled();
    });

    it('offers Consultorio when the month is full', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'plans.appointment_limit_reached',
                        message: 'Internal message.',
                        context: { appointment_limit: 40, month: '2026-01' },
                    },
                },
            },
        });
        const { result } = renderWithClient(
            useCreateAppointment,
            buildPlan('free'),
        );

        await result.current.mutateAsync(PAYLOAD).catch(() => {});

        await waitFor(() =>
            expect(result.current.message).toBe(
                'Llegaste al límite de turnos del mes que incluye el plan Gratis. Pasá a Consultorio desde Ajustes para seguir cargando turnos.',
            ),
        );
    });
});
