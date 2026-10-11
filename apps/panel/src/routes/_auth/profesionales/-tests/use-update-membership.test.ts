import {
    professionalRosterQueryOptions,
    professionalsQueryOptions,
} from '@/hooks/use-professionals';
import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    membershipQueryOptions,
    membershipsQueryOptions,
} from '../-hooks/use-memberships';
import {
    useDeactivateMembership,
    useUpdateMembership,
} from '../-hooks/use-update-membership';
import { reportQueryOptions } from '../../reportes/-hooks/use-report';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

function renderWithClient<T>(hook: () => T) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    return renderHook(hook, { wrapper }).result;
}

describe('membership mutation toasts', () => {
    beforeEach(() => {
        vi.mocked(notifySuccess).mockReset();
    });

    it('confirms saved changes', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: { data: {} } });
        const result = renderWithClient(() => useUpdateMembership(5));

        await result.current.mutateAsync({
            roles: ['professional'],
            status: 'active',
        });

        expect(notifySuccess).toHaveBeenCalledWith('Cambios guardados');
    });

    it('confirms a deactivation', async () => {
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        const result = renderWithClient(() => useDeactivateMembership());

        await result.current.mutateAsync(5);

        expect(notifySuccess).toHaveBeenCalledWith('Miembro dado de baja');
    });
});

describe('membership changes reach every page that lists members (#273)', () => {
    // Read only by loaders: the list and edit page here, Ajustes'
    // professionals, the roster of the agenda and other modules, the reports.
    const READS: Array<(queryClient: QueryClient) => Promise<unknown>> = [
        (queryClient) =>
            queryClient.ensureQueryData(
                membershipsQueryOptions({ q: '', page: 1 }),
            ),
        (queryClient) => queryClient.ensureQueryData(membershipQueryOptions(5)),
        (queryClient) =>
            queryClient.ensureQueryData(professionalsQueryOptions()),
        (queryClient) =>
            queryClient.ensureQueryData(professionalRosterQueryOptions()),
        (queryClient) => queryClient.ensureQueryData(reportQueryOptions({})),
    ];

    beforeEach(() => {
        vi.mocked(api.get)
            .mockReset()
            .mockResolvedValue({ data: { data: [], meta: {} } });
        vi.mocked(api.patch).mockResolvedValue({ data: { data: {} } });
        vi.mocked(api.delete).mockResolvedValue({ data: {} });
    });

    function renderWith<T>(queryClient: QueryClient, hook: () => T) {
        const wrapper = ({ children }: { children: ReactNode }) =>
            createElement(
                QueryClientProvider,
                { client: queryClient },
                children,
            );

        return renderHook(hook, { wrapper }).result;
    }

    it.each([
        {
            name: 'saving a member',
            run: (queryClient: QueryClient) =>
                renderWith(queryClient, () =>
                    useUpdateMembership(5),
                ).current.mutateAsync({ roles: ['staff'], status: 'active' }),
        },
        {
            name: 'deactivating a member',
            run: (queryClient: QueryClient) =>
                renderWith(
                    queryClient,
                    useDeactivateMembership,
                ).current.mutateAsync(5),
        },
    ])('$name makes those pages load them again', async ({ run }) => {
        const queryClient = new QueryClient({
            defaultOptions: { mutations: { retry: false } },
        });
        await Promise.all(READS.map((read) => read(queryClient)));
        vi.mocked(api.get).mockClear();

        await run(queryClient);
        await Promise.all(READS.map((read) => read(queryClient)));

        expect(api.get).toHaveBeenCalledTimes(READS.length);
    });
});
