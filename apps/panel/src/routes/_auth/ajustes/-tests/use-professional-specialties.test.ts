import { api } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToggleProfessionalSpecialty } from '../-hooks/use-professional-specialties';

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

function renderUseToggleProfessionalSpecialty(membershipId: number) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(
        () => useToggleProfessionalSpecialty(membershipId),
        { wrapper },
    );

    return { result };
}

const MEMBERSHIP_ID = 9;
const SPECIALTY_ID = 4;

describe('useToggleProfessionalSpecialty', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(api.delete).mockReset();
        vi.mocked(toast.success).mockClear();
        vi.mocked(toast.error).mockClear();
    });

    it('assign posts the specialty and fires a success toast', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { result } = renderUseToggleProfessionalSpecialty(MEMBERSHIP_ID);

        await result.current.assign.mutateAsync(SPECIALTY_ID);

        expect(api.post).toHaveBeenCalledWith(
            `/memberships/${MEMBERSHIP_ID}/specialties`,
            { specialty_id: SPECIALTY_ID },
        );
        expect(toast.success).toHaveBeenCalledWith('Especialidad asignada');
    });

    it('assign fires an error toast on failure', async () => {
        vi.mocked(api.post).mockRejectedValueOnce(
            unauthorizedError({ message: 'No se pudo asignar.' }),
        );
        const { result } = renderUseToggleProfessionalSpecialty(MEMBERSHIP_ID);

        await result.current.assign.mutateAsync(SPECIALTY_ID).catch(() => {});

        await waitFor(() => expect(result.current.assign.isError).toBe(true));
        expect(toast.error).toHaveBeenCalledWith('No se pudo asignar.');
    });

    it('remove deletes the specialty and fires a success toast', async () => {
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        const { result } = renderUseToggleProfessionalSpecialty(MEMBERSHIP_ID);

        await result.current.remove.mutateAsync(SPECIALTY_ID);

        expect(api.delete).toHaveBeenCalledWith(
            `/memberships/${MEMBERSHIP_ID}/specialties/${SPECIALTY_ID}`,
        );
        expect(toast.success).toHaveBeenCalledWith('Especialidad quitada');
    });

    it('remove fires an error toast on failure', async () => {
        vi.mocked(api.delete).mockRejectedValueOnce(
            unauthorizedError({ message: 'No se pudo quitar.' }),
        );
        const { result } = renderUseToggleProfessionalSpecialty(MEMBERSHIP_ID);

        await result.current.remove.mutateAsync(SPECIALTY_ID).catch(() => {});

        await waitFor(() => expect(result.current.remove.isError).toBe(true));
        expect(toast.error).toHaveBeenCalledWith('No se pudo quitar.');
    });
});
