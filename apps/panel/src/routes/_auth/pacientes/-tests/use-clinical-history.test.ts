import {
    patientClinicalAccessQueryKey,
    patientClinicalNotesQueryKey,
    patientMedicalHistoryQueryKey,
    patientPrescriptionsQueryKey,
    patientQueryOptions,
    patientVitalSignsQueryKey,
} from '@/hooks/use-patient';
import { api } from '@/lib/api';
import { buildClinicalNote } from '@/tests/fixtures/clinical-note';
import type { PatientDetail } from '@/types/patient';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadClinicalHistory } from '../-hooks/use-clinical-history';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const EMPTY_TRAIL = {
    data: [],
    meta: { current_page: 1, last_page: 1, per_page: 10, total: 0 },
    links: { first: null, last: null, prev: null, next: null },
};

const EMPTY_BACKGROUND = { blood_types: [], entries: [] };

// The notes' list for `/clinical-notes`, the trail's page for
// `/clinical-access-logs`, an empty background for `/medical-history` and an
// empty list for the medication and the measurements.
function answerHistory(note: unknown, trail: unknown = EMPTY_TRAIL) {
    vi.mocked(api.get).mockImplementation((url: string) =>
        Promise.resolve({
            data: url.endsWith('/clinical-access-logs')
                ? trail
                : {
                      data: url.endsWith('/clinical-notes')
                          ? [note]
                          : url.endsWith('/medical-history')
                            ? EMPTY_BACKGROUND
                            : [],
                  },
        }),
    );
}

// A history already in the cache: nothing written yet.
function seededHistory(): QueryClient {
    const queryClient = new QueryClient();
    queryClient.setQueryData(patientClinicalNotesQueryKey(10), []);
    queryClient.setQueryData(patientPrescriptionsQueryKey(10), []);
    queryClient.setQueryData(patientVitalSignsQueryKey(10), []);
    queryClient.setQueryData(
        patientMedicalHistoryQueryKey(10),
        EMPTY_BACKGROUND,
    );

    return queryClient;
}

const REASON_REQUIRED = {
    isAxiosError: true,
    response: {
        status: 409,
        data: {
            error: {
                code: 'clinical_access.reason_required',
                message: 'Opening this clinical history requires a reason.',
                context: {},
            },
        },
    },
};

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
                { trailPage: 1, fresh: true },
            ),
        ).resolves.toEqual({ access: 'denied' });
        expect(api.get).not.toHaveBeenCalled();
    });

    it('asks nothing while the history takes a reason', async () => {
        await expect(
            loadClinicalHistory(
                new QueryClient(),
                buildPatient({ clinical_access_reason_required: true }),
                { trailPage: 1, fresh: true },
            ),
        ).resolves.toEqual({ access: 'reason_required' });
        expect(api.get).not.toHaveBeenCalled();
    });

    it('reads the notes, the medication, the measurements, the background and then the page of the trail once the history is open', async () => {
        const note = buildClinicalNote({ id: 3 });
        answerHistory(note);

        await expect(
            loadClinicalHistory(new QueryClient(), buildPatient(), {
                trailPage: 2,
                fresh: true,
            }),
        ).resolves.toEqual({
            access: 'open',
            notes: [note],
            prescriptions: [],
            vitalSigns: [],
            medicalHistory: EMPTY_BACKGROUND,
            trail: EMPTY_TRAIL,
        });
        expect(api.get).toHaveBeenCalledWith('/patients/10/clinical-notes');
        expect(api.get).toHaveBeenCalledWith('/patients/10/prescriptions');
        expect(api.get).toHaveBeenCalledWith('/patients/10/vital-signs');
        expect(api.get).toHaveBeenCalledWith('/patients/10/medical-history');
        // Last, so it already holds the reads the others just logged.
        expect(vi.mocked(api.get).mock.calls.at(-1)).toEqual([
            '/patients/10/clinical-access-logs',
            { params: { page: 2 } },
        ]);
    });

    // Every read of the history adds to the trail, the agenda's included.
    it('reads the trail fresh on every load, even when it is cached', async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(
            [...patientClinicalAccessQueryKey(10), { page: 1 }],
            { ...EMPTY_TRAIL, meta: { ...EMPTY_TRAIL.meta, total: 99 } },
        );
        answerHistory(buildClinicalNote({ id: 3 }));

        const history = await loadClinicalHistory(queryClient, buildPatient(), {
            trailPage: 1,
            fresh: false,
        });

        expect(history).toMatchObject({ trail: EMPTY_TRAIL });
        expect(api.get).toHaveBeenCalledWith(
            '/patients/10/clinical-access-logs',
            { params: { page: 1 } },
        );
    });

    // ADR 0022: the API logs each read it answers (a repeat within
    // READ_REPEAT_MINUTES keeps its first row), so each visit asks again.
    it('asks for the whole history again on arriving at the page', async () => {
        const queryClient = seededHistory();
        answerHistory(buildClinicalNote({ id: 3 }));

        await loadClinicalHistory(queryClient, buildPatient(), {
            trailPage: 1,
            fresh: true,
        });

        expect(api.get).toHaveBeenCalledWith('/patients/10/clinical-notes');
        expect(api.get).toHaveBeenCalledWith('/patients/10/prescriptions');
        expect(api.get).toHaveBeenCalledWith('/patients/10/vital-signs');
        expect(api.get).toHaveBeenCalledWith('/patients/10/medical-history');
    });

    // Paging the trail would otherwise push new reads onto the page it pages.
    it('reuses them while staying on the page', async () => {
        const queryClient = seededHistory();
        answerHistory(buildClinicalNote({ id: 3 }));

        await expect(
            loadClinicalHistory(queryClient, buildPatient(), {
                trailPage: 2,
                fresh: false,
            }),
        ).resolves.toMatchObject({
            notes: [],
            prescriptions: [],
            vitalSigns: [],
            medicalHistory: EMPTY_BACKGROUND,
        });
        expect(vi.mocked(api.get).mock.calls).toEqual([
            ['/patients/10/clinical-access-logs', { params: { page: 2 } }],
        ]);
    });

    // The exceptional access expired while the patient stayed cached.
    it('asks for the reason again on a 409, and drops the stale patient', async () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(
            patientQueryOptions(10).queryKey,
            buildPatient(),
        );
        vi.mocked(api.get).mockRejectedValue(REASON_REQUIRED);

        await expect(
            loadClinicalHistory(queryClient, buildPatient(), {
                trailPage: 1,
                fresh: true,
            }),
        ).resolves.toEqual({ access: 'reason_required' });
        expect(
            queryClient.getQueryData(patientQueryOptions(10).queryKey),
        ).toBeUndefined();
    });

    // With the notes cached, the trail is the one request a reload sends.
    it('asks for the reason again when only the trail answers 409', async () => {
        const queryClient = seededHistory();
        queryClient.setQueryData(
            patientQueryOptions(10).queryKey,
            buildPatient(),
        );
        vi.mocked(api.get).mockRejectedValue(REASON_REQUIRED);

        await expect(
            loadClinicalHistory(queryClient, buildPatient(), {
                trailPage: 1,
                fresh: false,
            }),
        ).resolves.toEqual({ access: 'reason_required' });
        expect(api.get).toHaveBeenCalledTimes(1);
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
            loadClinicalHistory(new QueryClient(), buildPatient(), {
                trailPage: 1,
                fresh: true,
            }),
        ).rejects.toBe(error);
    });
});
