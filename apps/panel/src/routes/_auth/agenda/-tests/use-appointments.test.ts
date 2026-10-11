import { api } from '@/lib/api';
import { planQueryOptions } from '@/lib/plan';
import { notifySuccess } from '@/lib/toast';
import { buildPlan } from '@/tests/fixtures/plan';
import type { PatientAppointmentHistoryItem } from '@/types/patient';
import type { Plan } from '@/types/plan';
import type { OrganizationReport } from '@/types/report';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    useCancelAppointment,
    useCreateAppointment,
    useRescheduleAppointment,
    useUpdateAppointmentStatus,
} from '../-hooks/use-appointments';
import { patientAppointmentsQueryOptions } from '../../pacientes/-hooks/use-patient-appointments';
import { patientClinicalNotesQueryOptions } from '../../pacientes/-hooks/use-patient-clinical-notes';
import { reportQueryOptions } from '../../reportes/-hooks/use-report';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/lib/toast', () => ({
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
}));

const invalidate = vi.fn();

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

function renderWithClient<T>(hook: () => T, plan?: Plan) {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    if (plan) {
        queryClient.setQueryData(planQueryOptions.queryKey, plan);
    }
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(hook, { wrapper });

    return { result, invalidateQueries };
}

const renderUseCreateAppointment = () => renderWithClient(useCreateAppointment);

const PAYLOAD = {
    membershipId: 1,
    patientId: 2,
    serviceId: 3,
    startAt: '2026-01-15T13:00:00.000Z',
    reason: null,
    notes: null,
};

describe('useCreateAppointment', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(notifySuccess).mockReset();
        invalidate.mockClear();
    });

    it('confirms the booking with its local date and time in a success toast', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { result } = renderUseCreateAppointment();

        // 13:00Z is 10:00 in Buenos Aires (the suite's TZ).
        await result.current.mutateAsync(PAYLOAD);

        expect(notifySuccess).toHaveBeenCalledWith(
            'Turno creado para el jueves 15 de enero a las 10:00.',
        );
    });

    it('invalidates the router on success', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { result } = renderUseCreateAppointment();

        await result.current.mutateAsync(PAYLOAD);

        expect(invalidate).toHaveBeenCalledTimes(1);
    });

    it('invalidates the appointments query key on success', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { result, invalidateQueries } = renderUseCreateAppointment();

        await result.current.mutateAsync(PAYLOAD);

        expect(invalidateQueries).toHaveBeenCalledWith({
            queryKey: ['appointments'],
            refetchType: 'all',
        });
    });

    it('does not invalidate anything when the mutation fails', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 500 },
        });
        const { result, invalidateQueries } = renderUseCreateAppointment();

        await result.current.mutateAsync(PAYLOAD).catch(() => {});

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(invalidate).not.toHaveBeenCalled();
        expect(invalidateQueries).not.toHaveBeenCalled();
    });
});

describe('useRescheduleAppointment / useCancelAppointment', () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(api.patch).mockReset();
        vi.mocked(notifySuccess).mockReset();
    });

    it('confirms a reschedule with the new local date and time', async () => {
        vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
        const { result } = renderWithClient(useRescheduleAppointment);

        await result.current.mutateAsync({
            appointmentId: 7,
            patientId: 2,
            startAt: '2026-08-10T17:30:00.000Z',
        });

        expect(notifySuccess).toHaveBeenCalledWith(
            'Turno reprogramado para el lunes 10 de agosto a las 14:30.',
        );
    });

    it('confirms a cancellation', async () => {
        vi.mocked(api.patch).mockResolvedValueOnce({ data: {} });
        const { result } = renderWithClient(useCancelAppointment);

        await result.current.mutateAsync({ appointmentId: 7, patientId: 2 });

        expect(notifySuccess).toHaveBeenCalledWith('Turno cancelado.');
    });

    it('does not toast success when the reschedule fails', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: { status: 500 },
        });
        const { result } = renderWithClient(useRescheduleAppointment);

        await result.current
            .mutateAsync({
                appointmentId: 7,
                patientId: 2,
                startAt: '2026-08-10T17:30:00Z',
            })
            .catch(() => {});

        expect(notifySuccess).not.toHaveBeenCalled();
    });
});

describe("on Free, which counts the month's appointments (#238)", () => {
    beforeEach(() => {
        vi.mocked(api.post).mockReset();
        vi.mocked(api.patch).mockReset();
    });

    it('refreshes the plan after creating, rescheduling or cancelling an appointment', async () => {
        vi.mocked(api.post).mockResolvedValue({ data: {} });
        vi.mocked(api.patch).mockResolvedValue({ data: {} });
        const free = buildPlan('free');
        const create = renderWithClient(useCreateAppointment, free);
        const reschedule = renderWithClient(useRescheduleAppointment, free);
        const cancel = renderWithClient(useCancelAppointment, free);

        await create.result.current.mutateAsync(PAYLOAD);
        await reschedule.result.current.mutateAsync({
            appointmentId: 7,
            patientId: 2,
            startAt: '2026-08-10T17:30:00.000Z',
        });
        await cancel.result.current.mutateAsync({
            appointmentId: 7,
            patientId: 2,
        });

        for (const { invalidateQueries } of [create, reschedule, cancel]) {
            expect(invalidateQueries).toHaveBeenCalledWith({
                queryKey: ['plan'],
                refetchType: 'all',
            });
        }
    });

    it('refreshes the plan when the server says the month is full, so the banner catches up', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'plans.appointment_limit_reached',
                        message: 'Internal message.',
                        context: { appointment_limit: 40, month: '2026-01' },
                    },
                },
            },
        });
        const { result, invalidateQueries } = renderWithClient(
            useCreateAppointment,
            buildPlan('free'),
        );

        await result.current.mutateAsync(PAYLOAD).catch(() => {});

        await waitFor(() =>
            expect(invalidateQueries).toHaveBeenCalledWith({
                queryKey: ['plan'],
                refetchType: 'all',
            }),
        );
        expect(invalidate).not.toHaveBeenCalled();
    });

    it('offers Consultorio when the month is full', async () => {
        vi.mocked(api.post).mockRejectedValueOnce({
            isAxiosError: true,
            response: {
                status: 409,
                data: {
                    error: {
                        code: 'plans.appointment_limit_reached',
                        message: 'Internal message.',
                        context: { appointment_limit: 40, month: '2026-01' },
                    },
                },
            },
        });
        const { result } = renderWithClient(
            useCreateAppointment,
            buildPlan('free'),
        );

        await result.current.mutateAsync(PAYLOAD).catch(() => {});

        await waitFor(() =>
            expect(result.current.message).toBe(
                'Llegaste al límite de turnos del mes que incluye el plan Gratis. Pasá a Consultorio desde Ajustes para seguir cargando turnos.',
            ),
        );
    });
});

describe("refreshes the patient page's loader-only reads (#273)", () => {
    const HISTORY_ITEM = { id: 7 } as PatientAppointmentHistoryItem;

    // Visiting the patient page (id 2) left its history and notes cached by
    // its loader's `ensureQueryData`: no observer, so nothing refetches them
    // unless the mutation does.
    async function renderWithPatientPageVisited<T>(hook: () => T) {
        const queryClient = new QueryClient({
            defaultOptions: { mutations: { retry: false } },
        });
        vi.mocked(api.get).mockImplementation((url: string) =>
            url === '/patients/2/clinical-notes'
                ? Promise.reject({
                      isAxiosError: true,
                      response: { status: 403, data: {} },
                  })
                : Promise.resolve({ data: { data: [] } }),
        );
        await queryClient.ensureQueryData(patientAppointmentsQueryOptions(2));
        await queryClient.ensureQueryData(patientClinicalNotesQueryOptions(2));
        // What the API answers once the appointment exists.
        vi.mocked(api.get).mockImplementation((url: string) =>
            Promise.resolve({
                data: {
                    data: url.startsWith('/patients/2/') ? [HISTORY_ITEM] : [],
                },
            }),
        );
        const wrapper = ({ children }: { children: ReactNode }) =>
            createElement(
                QueryClientProvider,
                { client: queryClient },
                children,
            );

        const { result } = renderHook(hook, { wrapper });

        return { result, queryClient };
    }

    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} });
        vi.mocked(api.patch).mockReset().mockResolvedValue({ data: {} });
    });

    it.each([
        {
            name: 'creating',
            run: async () => {
                const { result, queryClient } =
                    await renderWithPatientPageVisited(useCreateAppointment);
                await result.current.mutateAsync(PAYLOAD);
                return queryClient;
            },
        },
        {
            name: 'cancelling',
            run: async () => {
                const { result, queryClient } =
                    await renderWithPatientPageVisited(useCancelAppointment);
                await result.current.mutateAsync({
                    appointmentId: 7,
                    patientId: 2,
                });
                return queryClient;
            },
        },
        {
            name: 'rescheduling',
            run: async () => {
                const { result, queryClient } =
                    await renderWithPatientPageVisited(
                        useRescheduleAppointment,
                    );
                await result.current.mutateAsync({
                    appointmentId: 7,
                    patientId: 2,
                    startAt: '2026-08-10T17:30:00.000Z',
                });
                return queryClient;
            },
        },
        {
            name: 'changing the status of',
            run: async () => {
                const { result, queryClient } =
                    await renderWithPatientPageVisited(
                        useUpdateAppointmentStatus,
                    );
                await result.current.mutateAsync({
                    appointmentId: 7,
                    patientId: 2,
                    status: 'arrived',
                });
                return queryClient;
            },
        },
    ])(
        '$name an appointment makes the patient page load its history and notes again',
        async ({ run }) => {
            const queryClient = await run();

            // What the patient page's loader does on the way back.
            await expect(
                queryClient.ensureQueryData(patientAppointmentsQueryOptions(2)),
            ).resolves.toEqual([HISTORY_ITEM]);
            await expect(
                queryClient.ensureQueryData(
                    patientClinicalNotesQueryOptions(2),
                ),
            ).resolves.toEqual([HISTORY_ITEM]);
        },
    );
});

describe('refreshes the reports, which count appointments', () => {
    const BEFORE = { period: 'before' } as unknown as OrganizationReport;
    const AFTER = { period: 'after' } as unknown as OrganizationReport;

    beforeEach(() => {
        vi.mocked(api.get).mockReset();
        vi.mocked(api.post).mockReset().mockResolvedValue({ data: {} });
        vi.mocked(api.patch).mockReset().mockResolvedValue({ data: {} });
    });

    it.each([
        {
            name: 'creating',
            mutate: (queryClient: QueryClient) =>
                renderWithQueryClient(
                    queryClient,
                    useCreateAppointment,
                ).current.mutateAsync(PAYLOAD),
        },
        {
            name: 'cancelling',
            mutate: (queryClient: QueryClient) =>
                renderWithQueryClient(
                    queryClient,
                    useCancelAppointment,
                ).current.mutateAsync({ appointmentId: 7, patientId: 2 }),
        },
        {
            name: 'rescheduling',
            mutate: (queryClient: QueryClient) =>
                renderWithQueryClient(
                    queryClient,
                    useRescheduleAppointment,
                ).current.mutateAsync({
                    appointmentId: 7,
                    patientId: 2,
                    startAt: '2026-08-10T17:30:00.000Z',
                }),
        },
        {
            name: 'changing the status of',
            mutate: (queryClient: QueryClient) =>
                renderWithQueryClient(
                    queryClient,
                    useUpdateAppointmentStatus,
                ).current.mutateAsync({
                    appointmentId: 7,
                    patientId: 2,
                    status: 'no_show',
                }),
        },
    ])(
        '$name an appointment makes the reports load again',
        async ({ mutate }) => {
            const queryClient = new QueryClient({
                defaultOptions: { mutations: { retry: false } },
            });
            // The reports page was visited: its loader cached the report.
            vi.mocked(api.get).mockResolvedValueOnce({
                data: { data: BEFORE },
            });
            await queryClient.ensureQueryData(reportQueryOptions({}));
            vi.mocked(api.get).mockResolvedValue({ data: { data: AFTER } });

            await mutate(queryClient);

            await expect(
                queryClient.ensureQueryData(reportQueryOptions({})),
            ).resolves.toEqual(AFTER);
        },
    );
});

function renderWithQueryClient<T>(queryClient: QueryClient, hook: () => T) {
    const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children);

    return renderHook(hook, { wrapper }).result;
}
