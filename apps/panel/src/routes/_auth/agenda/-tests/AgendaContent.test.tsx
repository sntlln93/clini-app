import { DateTime } from '@/lib/datetime';
import { planQueryOptions } from '@/lib/plan';
import { sessionQueryOptions, type SessionUser } from '@/lib/session';
import { buildProfessional } from '@/tests/fixtures/professional';
import type { Appointment } from '@/types/appointment';
import type { Plan } from '@/types/plan';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgendaContent } from '../-components/AgendaContent';

vi.mock('@/lib/api', () => ({
    api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@tanstack/react-router')>();
    return { ...actual, useRouter: () => ({ invalidate: vi.fn() }) };
});

// Wednesday, 5 August 2026.
const NOW = new Date('2026-08-05T13:30:00Z');
const TODAY = DateTime.local(2026, 8, 5);

const ana = buildProfessional({ id: 1 });

function appointmentOn(day: string, membershipId = ana.id): Appointment {
    return {
        id: 1,
        membership_id: membershipId,
        patient_id: 50,
        service_id: 100,
        status: 'scheduled',
        origin: 'manual',
        start_at: `${day}T13:00:00Z`,
        end_at: `${day}T13:30:00Z`,
        reason: null,
        notes: null,
        cancelled_at: null,
        cancellation_reason: null,
        rescheduled_from_id: null,
        reported_insurance_provider_id: null,
        reported_insurance_member_number: null,
        arrived_at: null,
        patient_name: 'Juan Pérez',
        service_name: 'Consulta general',
    };
}

type Props = Parameters<typeof AgendaContent>[0];

function renderContent(
    props: Partial<Props> = {},
    { restricted = false }: { restricted?: boolean } = {},
) {
    const queryClient = new QueryClient();
    if (restricted) {
        queryClient.setQueryData(planQueryOptions.queryKey, {
            restricted: true,
        } as Plan);
    }
    const session: SessionUser = {
        id: 1,
        name: 'Ana',
        email: 'ana@example.com',
        organization: {
            id: 1,
            name: 'Consultorio Norte',
            slug: 'consultorio-norte',
            timezone: 'Etc/UTC',
        },
    };
    queryClient.setQueryData(sessionQueryOptions.queryKey, session);
    const merged: Props = {
        date: TODAY,
        view: 'day',
        professionals: [ana],
        visibleProfessionals: [ana],
        appointments: [],
        showSetup: false,
        noneVisibleFromFilter: false,
        canCreate: () => true,
        canUpdate: () => true,
        onCellClick: vi.fn(),
        onDayClick: vi.fn(),
        onToday: vi.fn(),
        onShowAllProfessionals: vi.fn(),
        ...props,
    };

    render(
        <QueryClientProvider client={queryClient}>
            <AgendaContent {...merged} />
        </QueryClientProvider>,
    );

    return merged;
}

describe('AgendaContent', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows the grid and its legend while the range has appointments', () => {
        renderContent({ appointments: [appointmentOn('2026-08-05')] });

        expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
        screen.getByText('Juan Pérez');
        screen.getByRole('list', { name: 'Referencias de estados' });
    });

    it('stands an empty state in for the grid of a day with no appointments', () => {
        const props = renderContent();

        screen.getByRole('heading', { level: 2, name: 'Hoy no tenés turnos' });
        expect(
            screen.queryByRole('list', { name: 'Referencias de estados' }),
        ).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Agendar turno' }));
        expect(props.onDayClick).toHaveBeenCalledWith(TODAY);
    });

    it('counts only the professionals on screen', () => {
        renderContent({ appointments: [appointmentOn('2026-08-05', 99)] });

        screen.getByRole('heading', { name: 'Hoy no tenés turnos' });
    });

    it('copies the practice booking link to share it', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        renderContent({ view: 'week' });

        screen.getByRole('heading', { name: 'Esta semana no tenés turnos' });
        fireEvent.click(
            screen.getByRole('button', { name: 'Copiar link de reservas' }),
        );

        expect(writeText).toHaveBeenCalledWith(
            `${window.location.origin}/reservar/consultorio-norte`,
        );
    });

    it('offers no manual appointment to whoever cannot create one', () => {
        renderContent({ canCreate: () => false });

        screen.getByRole('button', { name: 'Copiar link de reservas' });
        expect(
            screen.queryByRole('button', { name: 'Agendar turno' }),
        ).toBeNull();
    });

    it('only leads back to today from a day already over', () => {
        const props = renderContent({ date: TODAY.minus({ days: 1 }) });

        screen.getByRole('heading', { name: 'No hubo turnos ese día' });
        expect(
            screen.queryByRole('button', { name: 'Copiar link de reservas' }),
        ).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Ir a hoy' }));
        expect(props.onToday).toHaveBeenCalled();
    });

    it('keeps the grid while the setup checklist explains the empty agenda', () => {
        renderContent({ showSetup: true });

        expect(screen.queryByRole('heading', { level: 2 })).toBeNull();
        screen.getByText('Dra. Ana López');
        screen.getByRole('list', { name: 'Referencias de estados' });
    });

    it('offers no link to share while writes are restricted, and says why', () => {
        renderContent({}, { restricted: true });

        screen.getByRole('heading', { name: 'Hoy no tenés turnos' });
        screen.getByText(/el link de reservas no toma turnos/);
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('offers to show every professional when the filter leaves none', () => {
        const props = renderContent({
            visibleProfessionals: [],
            noneVisibleFromFilter: true,
        });

        screen.getByRole('heading', { name: 'No elegiste ningún profesional' });
        fireEvent.click(screen.getByRole('button', { name: 'Mostrar todos' }));
        expect(props.onShowAllProfessionals).toHaveBeenCalled();
    });
});
