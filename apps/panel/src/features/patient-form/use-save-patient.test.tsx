import { api } from '@/lib/api';
import type { PatientPayload } from '@/types/patient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSavePatient } from './use-save-patient';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({ notifySuccess: vi.fn() }));

function renderSavePatient(queryClient: QueryClient) {
    return renderHook(() => useSavePatient(12), {
        wrapper: ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        ),
    });
}

describe('useSavePatient', () => {
    it('drops the cached list pages so the list refetches after a save, keeping other patient queries', async () => {
        vi.mocked(api.put).mockResolvedValueOnce({
            data: { data: { id: 12, name: 'Juan Pérez' } },
        });
        const queryClient = new QueryClient();
        const listKey = ['patients', { q: '', page: 1 }];
        const lookupKey = ['patients', 'lookup', 'dni', '30111222'];
        queryClient.setQueryData(listKey, { data: [{ name: 'Juan Perez' }] });
        queryClient.setQueryData(lookupKey, null);
        const { result } = renderSavePatient(queryClient);

        await act(() =>
            result.current.mutateAsync({
                name: 'Juan Pérez',
            } as PatientPayload),
        );

        expect(queryClient.getQueryData(listKey)).toBeUndefined();
        expect(queryClient.getQueryState(lookupKey)).toBeDefined();
    });
});
