import { api } from '@/lib/api';
import { buildClinicalNote } from '@/tests/fixtures/clinical-note';
import type { Appointment } from '@/types/appointment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useAmendClinicalNote,
    useAnnulClinicalNote,
    useClinicalNotes,
    useCreateClinicalNote,
} from '../-hooks/use-clinical-notes';
import { patientClinicalNotesQueryOptions } from '../../pacientes/-hooks/use-patient-clinical-notes';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn() },
}));

const invalidate = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

const APPOINTMENT = { id: 42, patient_id: 50 } as Appointment;

const NOTE = buildClinicalNote({ body: 'Nota desde la agenda.' });

function forbidden() {
    return { isAxiosError: true, response: { status: 403, data: {} } };
}

// The patient page reads its notes in its loader (`ensureQueryData`), so the
// cached entry has no observer: a default invalidation never refetches it.
async function renderWithPatientPageVisited<T>(hook: () => T) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    vi.mocked(api.get).mockRejectedValueOnce(forbidden());
    await queryClient.ensureQueryData(patientClinicalNotesQueryOptions(50));
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(hook, { wrapper });

    return { result, queryClient };
}

describe('clinical note mutations from the agenda (#273)', () => {
    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} });
        invalidate.mockReset();
    });

    it.each([
        {
            name: 'creating',
            run: async () => {
                const rendered = await renderWithPatientPageVisited(() =>
                    useCreateClinicalNote(APPOINTMENT),
                );
                vi.mocked(api.get).mockResolvedValueOnce({
                    data: { data: [NOTE] },
                });
                await rendered.result.current.mutateAsync('Nota.');
                return rendered.queryClient;
            },
        },
        {
            name: 'amending',
            run: async () => {
                const rendered = await renderWithPatientPageVisited(() =>
                    useAmendClinicalNote(APPOINTMENT),
                );
                vi.mocked(api.get).mockResolvedValueOnce({
                    data: { data: [NOTE] },
                });
                await rendered.result.current.mutateAsync({
                    id: 1,
                    body: 'Nota.',
                    reason: null,
                });
                return rendered.queryClient;
            },
        },
        {
            name: 'annulling',
            run: async () => {
                const rendered = await renderWithPatientPageVisited(() =>
                    useAnnulClinicalNote(APPOINTMENT),
                );
                vi.mocked(api.get).mockResolvedValueOnce({
                    data: { data: [NOTE] },
                });
                await rendered.result.current.mutateAsync({
                    id: 1,
                    reason: 'Paciente equivocado.',
                });
                return rendered.queryClient;
            },
        },
    ])(
        '$name a note makes the patient page load its notes again',
        async ({ run }) => {
            const queryClient = await run();

            // What the patient page's loader does on the way back.
            await expect(
                queryClient.ensureQueryData(
                    patientClinicalNotesQueryOptions(50),
                ),
            ).resolves.toEqual([NOTE]);
            expect(api.get).toHaveBeenLastCalledWith(
                '/patients/50/clinical-notes',
            );
        },
    );

    it('a patient page reached while the refresh is still in flight loads the new note', async () => {
        const { result, queryClient } = await renderWithPatientPageVisited(() =>
            useCreateClinicalNote(APPOINTMENT),
        );
        const pending: Array<(value: unknown) => void> = [];
        vi.mocked(api.get).mockImplementation(
            () => new Promise((resolve) => pending.push(resolve)),
        );

        const saving = result.current.mutateAsync('Nota.');
        // The note is saved and its success handler is running.
        await vi.waitFor(() => expect(api.post).toHaveBeenCalled());
        await new Promise((resolve) => setTimeout(resolve, 0));

        // The user opens the patient page before any refetch has landed.
        const loading = queryClient.ensureQueryData(
            patientClinicalNotesQueryOptions(50),
        );
        for (const resolve of pending.splice(0)) {
            resolve({ data: { data: [NOTE] } });
        }

        await expect(loading).resolves.toEqual([NOTE]);
        await saving;
    });

    it('drops the patient page notes before re-running the current loaders, so a patient page reached while saving reloads them', async () => {
        const { result, queryClient } = await renderWithPatientPageVisited(() =>
            useCreateClinicalNote(APPOINTMENT),
        );
        let cachedWhenLoadersRerun: unknown = 'not re-run';
        invalidate.mockImplementation(() => {
            cachedWhenLoadersRerun = queryClient.getQueryData(
                patientClinicalNotesQueryOptions(50).queryKey,
            );
        });

        await result.current.mutateAsync('Nota.');

        expect(cachedWhenLoadersRerun).toBeUndefined();
    });

    it("lists a note saved while the dialog's first load was still in flight", async () => {
        const gets: Array<(value: unknown) => void> = [];
        vi.mocked(api.get).mockImplementation(
            () => new Promise((resolve) => gets.push(resolve)),
        );
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        const wrapper = ({ children }: { children: ReactNode }) =>
            createElement(
                QueryClientProvider,
                { client: queryClient },
                children,
            );
        const { result } = renderHook(
            () => ({
                notes: useClinicalNotes(42, true),
                create: useCreateClinicalNote(APPOINTMENT),
            }),
            { wrapper },
        );
        await waitFor(() => expect(gets).toHaveLength(1));

        const saving = result.current.create.mutateAsync('Nota.');
        // Asked again after the save instead of keeping the first answer.
        await waitFor(() => expect(gets).toHaveLength(2));
        gets[1]({ data: { data: [NOTE] } });
        gets[0]({ data: { data: [] } });
        await saving;

        await waitFor(() => expect(result.current.notes.data).toEqual([NOTE]));
    });
});
