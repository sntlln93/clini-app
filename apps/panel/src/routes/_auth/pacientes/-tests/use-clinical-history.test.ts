import { patientQueryOptions } from '@/hooks/use-patient';
import { api } from '@/lib/api';
import { buildClinicalNote } from '@/tests/fixtures/clinical-note';
import type { PatientDetail } from '@/types/patient';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadClinicalHistory } from '../-hooks/use-clinical-history';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

function buildPatient(overrides: Partial<PatientDetail> = {}): PatientDetail {
    return {
        id: 10,
        name: 'Lucía Fernández',
        email: null,
        phone: null,
        document_type: 'dni',
        document_number: '30111222',
        sex: null,
        birth_date: null,
        insurance_provider_id: null,
        insurance_member_number: null,
        created_at: '2026-10-01T12:00:00Z',
        can_view_clinical_notes: true,
        clinical_access_reason_required: false,
        ...overrides,
    };
}

describe('loadClinicalHistory', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
    });

    // #272: a patient whose history is closed to the acting membership leaves
    // no failed request behind.
    it('asks nothing when the acting membership may not read the history', async () => {
        await expect(
            loadClinicalHistory(
                new QueryClient(),
                buildPatient({ can_view_clinical_notes: false }),
            ),
        ).resolves.toEqual({ access: 'denied' });
        expect(api.get).not.toHaveBeenCalled();
    });

    it('asks nothing while the history takes a reason', async () => {
        await expect(
            loadClinicalHistory(
                new QueryClient(),
                buildPatient({ clinical_access_reason_required: true }),
            ),
        ).resolves.toEqual({ access: 'reason_required' });
        expect(api.get).not.toHaveBeenCalled();
    });

    it('reads the notes and the medication once the history is open', async () => {
        const note = buildClinicalNote({ id: 3 });
        vi.mocked(api.get).mockImplementation((url: string) =>
            Promise.resolve({
                data: { data: url.endsWith('/clinical-notes') ? [note] : [] },
            }),
        );

        await expect(
            loadClinicalHistory(new QueryClient(), buildPatient()),
        ).resolves.toEqual({
            access: 'open',
            notes: [note],
            prescriptions: [],
        });
        expect(api.get).toHaveBeenCalledWith('/patients/10/clinical-notes');
        expect(api.get).toHaveBeenCalledWith('/patients/10/prescriptions');
    });

    // The exceptional access expired while the patient stayed cached.
    it('asks for the reason again on a 409, and drops the stale patient', async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(
            patientQueryOptions(10).queryKey,
            buildPatient(),
        );
        vi.mocked(api.get).mockRejectedValue({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'clinical_access.reason_required',
                        message:
                            'Opening this clinical history requires a reason.',
                        context: {},
                    },
                },
            },
        });

        await expect(
            loadClinicalHistory(queryClient, buildPatient()),
        ).resolves.toEqual({ access: 'reason_required' });
        expect(
            queryClient.getQueryData(patientQueryOptions(10).queryKey),
        ).toBeUndefined();
    });

    it('still fails on any other error', async () => {
        const error = {
            isAxiosError: true,
            response: { status: 500, data: {} },
        };
        vi.mocked(api.get).mockRejectedValue(error);

        await expect(
            loadClinicalHistory(new QueryClient(), buildPatient()),
        ).rejects.toBe(error);
    });
});
