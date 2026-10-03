import { buildProfessional } from '@/tests/fixtures/professional';
import type { Appointment } from '@/types/appointment';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
    AgendaWeekView,
    type AgendaWeekViewProps,
} from '../-components/AgendaWeekView';

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
        start_at: '2026-08-04T10:00:00',
        end_at: '2026-08-04T10:30:00',
        reason: null,
        notes: null,
        cancelled_at: null,
        cancellation_reason: null,
        rescheduled_from_id: null,
        arrived_at: null,
        patient_name: 'Juan Pérez',
        service_name: 'Consulta general',
        ...overrides,
    };
}

// Sunday, 2 August 2026.
const WEEK_START = new Date(2026, 7, 2);

function renderWeekView(props: Partial<AgendaWeekViewProps> = {}) {
    const defaults: AgendaWeekViewProps = {
        weekStart: WEEK_START,
        professionals: [buildProfessional()],
        appointments: [],
        canUpdate: () => true,
        canCreate: () => true,
        onDayClick: vi.fn(),
    };
    const merged = { ...defaults, ...props };

    render(
        <QueryClientProvider client={new QueryClient()}>
            <AgendaWeekView {...merged} />
        </QueryClientProvider>,
    );

    return merged;
}

const quickCreateButtons = () =>
    screen.queryAllByRole('button', { name: /^Nuevo turno el / });

describe('AgendaWeekView', () => {
    it('offers one quick-create button per day, named after that day', () => {
        renderWeekView();

        expect(quickCreateButtons()).toHaveLength(7);
        expect(
            screen.getByRole('button', {
                name: 'Nuevo turno el domingo, 2 de agosto',
            }),
        ).toBeTruthy();
        expect(
            screen.getByRole('button', {
                name: 'Nuevo turno el sábado, 8 de agosto',
            }),
        ).toBeTruthy();
    });

    it('calls onDayClick with the clicked day', () => {
        const { onDayClick } = renderWeekView();

        fireEvent.click(quickCreateButtons()[2]);

        expect(onDayClick).toHaveBeenCalledOnce();
        const [day] = vi.mocked(onDayClick!).mock.calls[0];
        expect(day.getFullYear()).toBe(2026);
        expect(day.getMonth()).toBe(7);
        expect(day.getDate()).toBe(4);
    });

    it('offers quick-create when at least one visible professional is creatable', () => {
        const own = buildProfessional({
            id: 2,
            user: { id: 20, name: 'Dr. Luis Gómez', email: 'luis@example.com' },
        });

        renderWeekView({
            professionals: [buildProfessional(), own],
            canCreate: (professional) => professional.id === own.id,
        });

        expect(quickCreateButtons()).toHaveLength(7);
    });

    it('hides quick-create when no visible professional is creatable', () => {
        renderWeekView({ canCreate: () => false });

        expect(quickCreateButtons()).toHaveLength(0);
    });

    it('keeps appointment cards rendered alongside the quick-create control', () => {
        renderWeekView({ appointments: [buildAppointment()] });

        expect(screen.getByText('Juan Pérez')).toBeTruthy();
        expect(quickCreateButtons()).toHaveLength(7);
    });
});
