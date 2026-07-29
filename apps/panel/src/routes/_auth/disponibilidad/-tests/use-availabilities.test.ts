import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSaveAvailability } from '../-hooks/use-availabilities';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const invalidate = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

const MEMBERSHIP_ID = 7;

function renderUseSaveAvailability() {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useSaveAvailability(MEMBERSHIP_ID), {
        wrapper,
    });

    return { result, invalidateQueries };
}

const PAYLOAD = {
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
};

describe('useSaveAvailability', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        invalidate.mockClear();
    });

    it('invalidates the router on success', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { result } = renderUseSaveAvailability();

        await result.current.mutateAsync(PAYLOAD);

        expect(invalidate).toHaveBeenCalledTimes(1);
    });

    it('does not invalidate anything when the mutation fails', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 500 },
        });
        const { result, invalidateQueries } = renderUseSaveAvailability();

        await result.current.mutateAsync(PAYLOAD).catch(() => {});

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(invalidate).not.toHaveBeenCalled();
        expect(invalidateQueries).not.toHaveBeenCalled();
    });
});
