import { api } from '@/lib/api';
import type { Prescription, PrescriptionPayload } from '@/types/prescription';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    usePrescriptions,
    useSavePrescription,
} from '../-hooks/use-prescriptions';
import { patientPrescriptionsQueryOptions } from '../../pacientes/-hooks/use-patient-prescriptions';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const PRESCRIPTION = { id: 9 } as Prescription;
const SAVE = { prescriptionId: null, payload: {} as PrescriptionPayload };

function deferredGets() {
    const gets: Array<(value: unknown) => void> = [];
    vi.mocked(api.get).mockImplementation(
        () => new Promise((resolve) => gets.push(resolve)),
    );
    return gets;
}

function renderWithClient<T>(queryClient: QueryClient, hook: () => T) {
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    return renderHook(hook, { wrapper });
}

describe('useSavePrescription (#273)', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} });
    });

    it('makes a patient page reached while the save is still settling load the new prescription', async () => {
        const queryClient = new QueryClient();
        // The patient page was visited: its loader cached an empty list.
        vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [] } });
        await queryClient.ensureQueryData(patientPrescriptionsQueryOptions(50));
        const gets = deferredGets();
        const { result } = renderWithClient(queryClient, () =>
            useSavePrescription(42),
        );

        const saving = result.current.mutateAsync(SAVE);
        await vi.waitFor(() => expect(api.post).toHaveBeenCalled());
        await new Promise((resolve) => setTimeout(resolve, 0));

        // The user opens the patient page before any refetch has landed.
        const loading = queryClient.ensureQueryData(
            patientPrescriptionsQueryOptions(50),
        );
        for (const resolve of gets.splice(0)) {
            resolve({ data: { data: [PRESCRIPTION] } });
        }

        await expect(loading).resolves.toEqual([PRESCRIPTION]);
        await saving;
    });

    it("lists a prescription saved while the dialog's first load was still in flight", async () => {
        const gets = deferredGets();
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        const { result } = renderWithClient(queryClient, () => ({
            prescriptions: usePrescriptions(42, true),
            save: useSavePrescription(42),
        }));
        await waitFor(() => expect(gets).toHaveLength(1));

        const saving = result.current.save.mutateAsync(SAVE);
        // Asked again after the save instead of keeping the first answer.
        await waitFor(() => expect(gets).toHaveLength(2));
        gets[1]({ data: { data: [PRESCRIPTION] } });
        gets[0]({ data: { data: [] } });
        await saving;

        await waitFor(() =>
            expect(result.current.prescriptions.data).toEqual([PRESCRIPTION]),
        );
    });
});
