import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useAddLicenseToClini,
    useRemoveLicenseFromClini,
    useUpdateProfessionalDocument,
    useVerifyProfessionalLicenses,
} from '../-hooks/use-professional-licenses';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/minimum-duration', () => ({
    withMinimumDuration: <T>(promise: Promise<T>) => promise,
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

// What other pages read only in their loaders and a license write changes:
// which specialties each professional's licenses back (#387).
const DERIVED_KEYS = [
    ['backed-specialties', 3],
    ['memberships', 'cards', { q: '' }],
];

type Wrapper = ({ children }: { children: ReactNode }) => ReactNode;

// Each write, run through its own hook.
const WRITES: [string, (wrapper: Wrapper) => Promise<unknown>][] = [
    [
        'saving the DNI',
        (wrapper) =>
            renderHook(() => useUpdateProfessionalDocument(), {
                wrapper,
            }).result.current.mutateAsync('30123456'),
    ],
    [
        'adding a license to Clini',
        (wrapper) =>
            renderHook(() => useAddLicenseToClini(), {
                wrapper,
            }).result.current.mutateAsync(1),
    ],
    [
        'taking a license out of Clini',
        (wrapper) =>
            renderHook(() => useRemoveLicenseFromClini(), {
                wrapper,
            }).result.current.mutateAsync(1),
    ],
    [
        'checking them again',
        (wrapper) =>
            renderHook(() => useVerifyProfessionalLicenses(), {
                wrapper,
            }).result.current.mutateAsync(),
    ],
];

describe('license writes', () => {
    beforeEach(() => {
        vi.mocked(api.get)
            .mockReset()
            .mockResolvedValue({ data: { data: [] } });
        vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} });
        vi.mocked(api.put).mockReset().mockResolvedValue({ data: {} });
        vi.mocked(api.delete).mockReset().mockResolvedValue({ data: {} });
    });

    it.each(WRITES)(
        '%s drops the specialties the licenses back, wherever only a loader reads them',
        async (label, write) => {
            const queryClient = new QueryClient({
                defaultOptions: { mutations: { retry: false } },
            });
            for (const queryKey of DERIVED_KEYS) {
                queryClient.setQueryData(queryKey, []);
            }
            queryClient.setQueryData(['memberships', 'professionals'], []);

            await write(({ children }) =>
                createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    children,
                ),
            );

            for (const queryKey of DERIVED_KEYS) {
                expect(queryClient.getQueryData(queryKey)).toBeUndefined();
            }
            // Only loading the DNI renames the member (#417): any other list
            // of members keeps its data.
            expect(
                queryClient.getQueryData(['memberships', 'professionals']),
            ).toEqual(label === 'saving the DNI' ? undefined : []);
        },
    );

    it('saving the DNI reloads the session, whose name the registry gives', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { mutations: { retry: false } },
        });
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

        await renderHook(() => useUpdateProfessionalDocument(), {
            wrapper: ({ children }) =>
                createElement(
                    QueryClientProvider,
                    { client: queryClient },
                    children,
                ),
        }).result.current.mutateAsync('30123456');

        expect(invalidate).toHaveBeenCalledWith({
            queryKey: ['session'],
            refetchType: 'all',
        });
    });
});
