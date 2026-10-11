import { api } from '@/lib/api';
import type { OrganizationReport } from '@/types/report';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useDeleteAvailability,
    useSaveAvailability,
} from '../-hooks/use-availabilities';
import {
    useDeleteAvailabilityException,
    useSaveAvailabilityException,
} from '../-hooks/use-availability-exceptions';
import { reportQueryOptions } from '../../reportes/-hooks/use-report';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

const BEFORE = { period: 'before' } as unknown as OrganizationReport;
const AFTER = { period: 'after' } as unknown as OrganizationReport;

// The reports page was visited: its loader cached the report. Occupancy is
// computed from the published hours, so changing them must make that loader
// fetch it again instead of serving the cache (#273).
async function renderWithReportsVisited<T>(hook: () => T) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: BEFORE } });
    await queryClient.ensureQueryData(reportQueryOptions({}));
    vi.mocked(api.get).mockResolvedValue({ data: { data: AFTER } });
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(hook, { wrapper });

    return { result, queryClient };
}

const EXCEPTION = {
    membershipId: 3,
    type: 'blocked' as const,
    startAt: '2026-08-10T00:00:00Z',
    endAt: '2026-08-11T00:00:00Z',
    reason: null,
};

describe('availability changes refresh the reports', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} });
        vi.mocked(api.delete).mockReset().mockResolvedValue({ data: {} });
    });

    it.each([
        {
            name: 'saving a slot',
            run: async () => {
                const { result, queryClient } = await renderWithReportsVisited(
                    () => useSaveAvailability(3),
                );
                await result.current.mutateAsync({
                    dayOfWeek: 1,
                    startTime: '09:00',
                    endTime: '13:00',
                });
                return queryClient;
            },
        },
        {
            name: 'deleting a slot',
            run: async () => {
                const { result, queryClient } = await renderWithReportsVisited(
                    () => useDeleteAvailability(3),
                );
                await result.current.mutateAsync(5);
                return queryClient;
            },
        },
        {
            name: 'saving an exception',
            run: async () => {
                const { result, queryClient } = await renderWithReportsVisited(
                    () => useSaveAvailabilityException(3),
                );
                await result.current.mutateAsync(EXCEPTION);
                return queryClient;
            },
        },
        {
            name: 'deleting an exception',
            run: async () => {
                const { result, queryClient } = await renderWithReportsVisited(
                    () => useDeleteAvailabilityException(3),
                );
                await result.current.mutateAsync(5);
                return queryClient;
            },
        },
    ])('$name makes the reports load again', async ({ run }) => {
        const queryClient = await run();

        await expect(
            queryClient.ensureQueryData(reportQueryOptions({})),
        ).resolves.toEqual(AFTER);
    });
});
