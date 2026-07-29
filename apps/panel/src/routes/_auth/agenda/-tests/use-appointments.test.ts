import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateAppointment } from '../-hooks/use-appointments';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const invalidate = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

function renderUseCreateAppointment() {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useCreateAppointment(), { wrapper });

    return { result, invalidateQueries };
}

const PAYLOAD = {
    membershipId: 1,
    patientId: 2,
    serviceId: 3,
    startAt: '2026-01-15T10:00:00.000Z',
    reason: null,
    notes: null,
};

describe('useCreateAppointment', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        invalidate.mockClear();
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
