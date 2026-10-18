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

function renderSavePatient(queryClient: QueryClient, patientId?: number) {
    return renderHook(() => useSavePatient(patientId), {
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
        const { result } = renderSavePatient(queryClient, 12);

        await act(() =>
            result.current.mutateAsync({
                name: 'Juan Pérez',
            } as PatientPayload),
        );

        expect(queryClient.getQueryData(listKey)).toBeUndefined();
        expect(queryClient.getQueryState(lookupKey)).toBeDefined();
    });

    // Other pages read these only in their loaders (#273).
    it('drops the cached appointments after editing a patient, which show the name', async () => {
        vi.mocked(api.put).mockResolvedValueOnce({
            data: { data: { id: 12, name: 'Juan Pérez' } },
        });
        const queryClient = new QueryClient();
        const agendaKey = ['appointments', '2026-08-10', '2026-08-10', null];
        const reportKey = ['reports', {}];
        queryClient.setQueryData(agendaKey, [{ patient_name: 'Juan Perez' }]);
        queryClient.setQueryData(reportKey, { new_patients: 1 });
        const { result } = renderSavePatient(queryClient, 12);

        await act(() =>
            result.current.mutateAsync({
                name: 'Juan Pérez',
            } as PatientPayload),
        );

        expect(queryClient.getQueryData(agendaKey)).toBeUndefined();
        expect(queryClient.getQueryData(reportKey)).toEqual({
            new_patients: 1,
        });
    });

    it('drops the cached reports after creating a patient, which count new patients', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({
            data: { data: { id: 13, name: 'Ana Gómez' } },
        });
        const queryClient = new QueryClient();
        const agendaKey = ['appointments', '2026-08-10', '2026-08-10', null];
        const reportKey = ['reports', {}];
        queryClient.setQueryData(agendaKey, []);
        queryClient.setQueryData(reportKey, { new_patients: 1 });
        const { result } = renderSavePatient(queryClient);

        await act(() =>
            result.current.mutateAsync({ name: 'Ana Gómez' } as PatientPayload),
        );

        expect(queryClient.getQueryData(reportKey)).toBeUndefined();
        // A new patient has no appointments yet.
        expect(queryClient.getQueryData(agendaKey)).toEqual([]);
    });
});
