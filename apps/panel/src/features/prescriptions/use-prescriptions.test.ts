import { api } from '@/lib/api';
import { patientPrescriptionsQueryOptions } from '@/routes/_auth/pacientes/-hooks/use-patient-prescriptions';
import type {
    Prescription,
    PrescriptionAmendmentPayload,
} from '@/types/prescription';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useAnnulPrescription,
    usePrescriptions,
    useSavePrescription,
} from './use-prescriptions';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const PRESCRIPTION = { id: 9 } as Prescription;
const PAYLOAD: PrescriptionAmendmentPayload = {
    items: [
        {
            medication: 'Paracetamol',
            presentation: null,
            dosage: '1 cada 6 h',
            quantity: 1,
        },
    ],
    reason: 'Alergia.',
};
const SAVE = { prescriptionId: null, payload: PAYLOAD };

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

    it('recording one posts only the items, to the appointment', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        const { result } = renderWithClient(new QueryClient(), () =>
            useSavePrescription(42),
        );

        await result.current.mutateAsync(SAVE);

        expect(api.post).toHaveBeenCalledWith(
            '/appointments/42/prescriptions',
            { items: PAYLOAD.items },
        );
    });

    it('amending one posts the items and the reason as an amendment (#323)', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        const { result } = renderWithClient(new QueryClient(), () =>
            useSavePrescription(42),
        );

        await result.current.mutateAsync({
            prescriptionId: 9,
            payload: PAYLOAD,
        });

        expect(api.post).toHaveBeenCalledWith('/prescriptions/9/amendments', {
            items: PAYLOAD.items,
            reason: 'Alergia.',
        });
    });
});

describe('useAnnulPrescription (#344)', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} });
    });

    it('posts the reason as the annulment', async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
        const { result } = renderWithClient(new QueryClient(), () =>
            useAnnulPrescription(42),
        );

        await result.current.mutateAsync({
            id: 9,
            reason: 'Terminó el tratamiento.',
        });

        expect(api.post).toHaveBeenCalledWith('/prescriptions/9/annulment', {
            reason: 'Terminó el tratamiento.',
        });
    });

    it('drops the patient page list and refreshes the dialog list', async () => {
        const queryClient = new QueryClient();
        vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [] } });
        await queryClient.ensureQueryData(patientPrescriptionsQueryOptions(50));
        const annulled = { id: 9, annulment: {} } as Prescription;
        vi.mocked(api.get).mockResolvedValue({ data: { data: [annulled] } });
        const { result } = renderWithClient(queryClient, () => ({
            prescriptions: usePrescriptions(42, true),
            annul: useAnnulPrescription(42),
        }));
        await waitFor(() =>
            expect(result.current.prescriptions.data).toEqual([annulled]),
        );
        vi.mocked(api.get).mockClear();

        await result.current.annul.mutateAsync({
            id: 9,
            reason: 'Paciente equivocado.',
        });

        expect(
            queryClient.getQueryData(
                patientPrescriptionsQueryOptions(50).queryKey,
            ),
        ).toBeUndefined();
        expect(api.get).toHaveBeenCalledWith('/appointments/42/prescriptions');
    });
});
