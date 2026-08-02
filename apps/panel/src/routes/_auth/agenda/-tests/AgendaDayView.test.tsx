import { api } from '@/lib/api';
import type { Appointment } from '@/types/appointment';
import type { Membership } from '@/types/membership';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    AgendaDayView,
    type AgendaDayViewProps,
} from '../-components/AgendaDayView';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const invalidate = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate }) };
});

function buildMembership(overrides: Partial<Membership> = {}): Membership {
    return {
        id: 1,
        user: { id: 10, name: 'Dra. Ana López', email: 'ana@example.com' },
        roles: ['professional'],
        status: 'active',
        deleted_at: null,
        created_at: '2026-01-01T00:00:00',
        updated_at: '2026-01-01T00:00:00',
        ...overrides,
    };
}

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

function renderDayView(props: Partial<AgendaDayViewProps> = {}) {
    const queryClient = new QueryClient();
    const defaults: AgendaDayViewProps = {
        date: new Date(2026, 7, 3),
        professionals: [buildMembership()],
        appointments: [],
        canUpdate: () => true,
        canCreate: () => true,
        onCellClick: undefined,
    };
    const merged = { ...defaults, ...props };

    render(
        <QueryClientProvider client={queryClient}>
            <AgendaDayView {...merged} />
        </QueryClientProvider>,
    );

    return merged;
}

describe('AgendaDayView', () => {
    beforeEach(() => {
        vi.mocked(api.patch).mockReset();
        invalidate.mockReset();
    });

    it('renders 12 clickable hour slots for a creatable column', () => {
        renderDayView({ canCreate: () => true });

        expect(screen.getAllByRole('button')).toHaveLength(12);
    });

    it('reports the right professional and hour when an hour slot is clicked', () => {
        const onCellClick = vi.fn();
        const professional = buildMembership({ id: 1 });
        renderDayView({
            professionals: [professional],
            canCreate: () => true,
            onCellClick,
        });

        fireEvent.click(screen.getAllByRole('button')[0]);

        expect(onCellClick).toHaveBeenCalledWith(1, 8);
    });

    it('exposes no clickable hour slots for a non-creatable column (AC5)', () => {
        const onCellClick = vi.fn();
        renderDayView({ canCreate: () => false, onCellClick });

        expect(screen.queryByRole('button')).toBeNull();
        expect(onCellClick).not.toHaveBeenCalled();
    });

    it('gates creation per column for a create.own user over a colleague (AC5)', () => {
        const onCellClick = vi.fn();
        const own = buildMembership({ id: 1 });
        const colleague = buildMembership({ id: 2 });
        renderDayView({
            professionals: [own, colleague],
            canCreate: (membership) => membership.id === 1,
            onCellClick,
        });

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(12);

        buttons.forEach((button) => fireEvent.click(button));

        expect(onCellClick).not.toHaveBeenCalledWith(2, expect.any(Number));
        onCellClick.mock.calls.forEach((call) => {
            expect(call[0]).toBe(1);
        });
    });

    it('still shows the professional and their appointments when the column is not creatable', () => {
        const professional = buildMembership({ id: 1 });
        renderDayView({
            professionals: [professional],
            canCreate: () => false,
            appointments: [buildAppointment({ membership_id: 1 })],
        });

        expect(screen.getByText('Dra. Ana López')).toBeTruthy();
        expect(screen.getByText('Juan Pérez')).toBeTruthy();
    });
});
