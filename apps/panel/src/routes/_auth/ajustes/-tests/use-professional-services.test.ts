import { api } from '@/lib/api';
import { notifyError, notifySuccess } from '@/lib/toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useAssignProfessionalService,
    useRemoveProfessionalService,
    useUpdateProfessionalService,
} from '../-hooks/use-professional-services';

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

const MEMBERSHIP_ID = 9;
const PAYLOAD = {
    serviceId: 4,
    durationMinutes: 30,
    priceCents: null,
    active: true,
};
const CONFLICT = { isAxiosError: true, response: { status: 409, data: {} } };

function renderWithClient<T>(hook: () => T) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    return renderHook(hook, { wrapper }).result;
}

describe('professional service mutations', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(api.patch).mockReset();
        vi.mocked(api.delete).mockReset();
        vi.mocked(notifySuccess).mockReset();
        vi.mocked(notifyError).mockReset();
    });

    it('confirms an assignment with a toast', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const result = renderWithClient(() =>
            useAssignProfessionalService(MEMBERSHIP_ID),
        );

        await result.current.mutateAsync(PAYLOAD);

        expect(notifySuccess).toHaveBeenCalledWith('Servicio asignado');
    });

    it('confirms an update with a toast', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        const result = renderWithClient(() =>
            useUpdateProfessionalService(MEMBERSHIP_ID),
        );

        await result.current.mutateAsync(PAYLOAD);

        expect(notifySuccess).toHaveBeenCalledWith('Servicio actualizado');
    });

    it('keeps a failed update inline, without an error toast', async () => {
        vi.mocked(api.patch).mockRejectedValueOnce(CONFLICT);
        const result = renderWithClient(() =>
            useUpdateProfessionalService(MEMBERSHIP_ID),
        );

        await result.current.mutateAsync(PAYLOAD).catch(() => {});

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(notifyError).not.toHaveBeenCalled();
    });

    it('confirms a removal with a toast', async () => {
        vi.mocked(api.delete).mockResolvedValueOnce({ data: {} });
        const result = renderWithClient(() =>
            useRemoveProfessionalService(MEMBERSHIP_ID),
        );

        await result.current.mutateAsync(4);

        expect(notifySuccess).toHaveBeenCalledWith('Servicio quitado');
    });

    it('reports a failed removal with an error toast', async () => {
        vi.mocked(api.delete).mockRejectedValueOnce(CONFLICT);
        const result = renderWithClient(() =>
            useRemoveProfessionalService(MEMBERSHIP_ID),
        );

        await result.current.mutateAsync(4).catch(() => {});

        await waitFor(() =>
            expect(notifyError).toHaveBeenCalledWith(
                CONFLICT,
                'No se pudo quitar el servicio',
            ),
        );
    });
});
