import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
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

const CONFLICT = { isAxiosError: true, response: { status: 409, data: {} } };

function renderWithClient<T>(hook: () => T) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    return renderHook(hook, { wrapper }).result;
}

describe('availability mutation toasts', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(api.delete).mockReset();
        vi.mocked(notifySuccess).mockReset();
        vi.mocked(notifyError).mockReset();
    });

    it('confirms a saved slot', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const result = renderWithClient(() => useSaveAvailability(3));

        await result.current.mutateAsync({
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '13:00',
        });

        expect(notifySuccess).toHaveBeenCalledWith('Horario guardado');
    });

    it('keeps a failed slot save inline, without an error toast', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(CONFLICT);
        const result = renderWithClient(() => useSaveAvailability(3));

        await result.current
            .mutateAsync({ dayOfWeek: 1, startTime: '09:00', endTime: '13:00' })
            .catch(() => {});

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(notifyError).not.toHaveBeenCalled();
    });

    it('confirms a deleted slot and reports a failed one', async () => {
        vi.mocked(api.delete)
            .mockResolvedValueOnce({ data: {} })
            .mockRejectedValueOnce(CONFLICT);
        const result = renderWithClient(() => useDeleteAvailability(3));

        await result.current.mutateAsync(7);
        expect(notifySuccess).toHaveBeenCalledWith('Horario eliminado');

        await result.current.mutateAsync(7).catch(() => {});
        await waitFor(() =>
            expect(notifyError).toHaveBeenCalledWith(
                CONFLICT,
                'No se pudo eliminar el horario',
            ),
        );
    });

    it('confirms a saved exception', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const result = renderWithClient(() => useSaveAvailabilityException(3));

        await result.current.mutateAsync({
            membershipId: 3,
            type: 'blocked',
            startAt: '2026-10-12T12:00:00Z',
            endAt: '2026-10-12T16:00:00Z',
            reason: null,
        });

        expect(notifySuccess).toHaveBeenCalledWith('Excepción guardada');
    });

    it('confirms a deleted exception and reports a failed one', async () => {
        vi.mocked(api.delete)
            .mockResolvedValueOnce({ data: {} })
            .mockRejectedValueOnce(CONFLICT);
        const result = renderWithClient(() =>
            useDeleteAvailabilityException(3),
        );

        await result.current.mutateAsync(12);
        expect(notifySuccess).toHaveBeenCalledWith('Excepción eliminada');

        await result.current.mutateAsync(12).catch(() => {});
        await waitFor(() =>
            expect(notifyError).toHaveBeenCalledWith(
                CONFLICT,
                'No se pudo eliminar la excepción',
            ),
        );
    });
});
