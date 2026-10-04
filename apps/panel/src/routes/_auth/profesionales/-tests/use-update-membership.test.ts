import { api } from '@/lib/api';
import { notifySuccess } from '@/lib/toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useDeactivateMembership,
    useUpdateMembership,
} from '../-hooks/use-update-membership';

vi.mock('@/lib/api', () => ({
    api: { patch: vi.fn(), delete: vi.fn() },
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
