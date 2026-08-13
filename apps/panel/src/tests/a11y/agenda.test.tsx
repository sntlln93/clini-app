import { api } from '@/lib/api';
import { buildProfessional } from '@/tests/fixtures/professional';
import type { Appointment } from '@/types/appointment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { describe, it, vi } from 'vitest';

import { AgendaDayView } from '@/routes/_auth/agenda/-components/AgendaDayView';
import { expectNoA11yViolations } from '../a11y';

// AgendaDayView renders AppointmentCard, whose mutation hook would make a
// real network call on mount, so api is mocked.
vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
    return {
        id: 1,
        membership_id: 1,
        patient_id: 50,
        service_id: 100,
        status: 'scheduled',
        origin: 'manual',
        start_at: '2026-08-03T10:00:00',
        end_at: '2026-08-03T10:30:00',
        reason: null,
        notes: null,
        cancelled_at: null,
        cancellation_reason: null,
        rescheduled_from_id: null,
        patient_name: 'Juan Pérez',
        service_name: 'Consulta general',
        ...overrides,
    };
}

describe('calendar/agenda a11y', () => {
    it('AgendaDayView: a creatable column with a real appointment card has no violations', async () => {
        vi.mocked(api.get).mockReset();
        const queryClient = new QueryClient();
        const professional = buildProfessional();

        const { container } = render(
            <QueryClientProvider client={queryClient}>
                <AgendaDayView
                    date={new Date(2026, 7, 3)}
                    professionals={[professional]}
                    appointments={[
                        buildAppointment({ membership_id: professional.id }),
                    ]}
                    canUpdate={() => true}
                    canCreate={() => true}
                />
            </QueryClientProvider>,
        );

        await expectNoA11yViolations(container);
    });
});
