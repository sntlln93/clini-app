import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToggleUserSpecialty } from '../-hooks/use-user-specialties';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

function unauthorizedError(data: unknown) {
    return { isAxiosError: true, response: { status: 422, data } };
}

function renderUseToggleUserSpecialty(userId: number) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useToggleUserSpecialty(userId), {
        wrapper,
    });

    return { result, invalidateQueries };
}

const USER_ID = 7;
const SPECIALTY_ID = 3;

describe('useToggleUserSpecialty', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(api.delete).mockReset();
        vi.mocked(toast.success).mockClear();
        vi.mocked(toast.error).mockClear();
    });

    it('assign posts the specialty and fires a success toast', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { result } = renderUseToggleUserSpecialty(USER_ID);

        await result.current.assign.mutateAsync(SPECIALTY_ID);

        expect(api.post).toHaveBeenCalledWith(`/users/${USER_ID}/specialties`, {
            specialty_id: SPECIALTY_ID,
        });
        expect(toast.success).toHaveBeenCalledWith('Especialidad asignada');
    });

    it('assign fires an error toast and no success toast on failure', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            unauthorizedError({ message: 'No se pudo asignar.' }),
        );
        const { result } = renderUseToggleUserSpecialty(USER_ID);

        await result.current.assign.mutateAsync(SPECIALTY_ID).catch(() => {});

        await waitFor(() => expect(result.current.assign.isError).toBe(true));
        expect(toast.error).toHaveBeenCalledWith('No se pudo asignar.');
        expect(toast.success).not.toHaveBeenCalled();
    });

    it('remove deletes the specialty and fires a success toast', async () => {
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        const { result } = renderUseToggleUserSpecialty(USER_ID);

        await result.current.remove.mutateAsync(SPECIALTY_ID);

        expect(api.delete).toHaveBeenCalledWith(
            `/users/${USER_ID}/specialties/${SPECIALTY_ID}`,
        );
        expect(toast.success).toHaveBeenCalledWith('Especialidad quitada');
    });

    it('remove fires an error toast and no success toast on failure', async () => {
        vi.mocked(api.delete).mockRejectedValueOnce(
            unauthorizedError({ message: 'No se pudo quitar.' }),
        );
        const { result } = renderUseToggleUserSpecialty(USER_ID);

        await result.current.remove.mutateAsync(SPECIALTY_ID).catch(() => {});

        await waitFor(() => expect(result.current.remove.isError).toBe(true));
        expect(toast.error).toHaveBeenCalledWith('No se pudo quitar.');
        expect(toast.success).not.toHaveBeenCalled();
    });

    it('invalidates the user-specialties query on a successful assign', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { result, invalidateQueries } =
            renderUseToggleUserSpecialty(USER_ID);

        await result.current.assign.mutateAsync(SPECIALTY_ID);

        expect(invalidateQueries).toHaveBeenCalledWith({
            queryKey: ['user-specialties', USER_ID],
            refetchType: 'all',
        });
    });
});
