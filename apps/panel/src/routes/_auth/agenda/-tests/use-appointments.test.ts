import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
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

function renderWithClient<T>(hook: () => T) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
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
