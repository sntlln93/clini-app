import { expectNoA11yViolations } from '@/tests/a11y';
import { buildProfessional } from '@/tests/fixtures/professional';
import type { Appointment } from '@/types/appointment';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WaitingRoomBoard } from '../-components/WaitingRoomBoard';

function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
    return {
        id: 1,
        membership_id: 1,
        patient_id: 50,
        service_id: 100,
        status: 'arrived',
        origin: 'manual',
        start_at: '2026-08-03T10:00:00',
        end_at: '2026-08-03T10:30:00',
        reason: null,
        notes: null,
        cancelled_at: null,
        cancellation_reason: null,
        rescheduled_from_id: null,
        arrived_at: '2026-08-03T09:50:00',
        patient_name: 'Juan Pérez',
        ...overrides,
    };
}

const ana = buildProfessional({ id: 1 });
const beto = buildProfessional({
    id: 2,
    user: { id: 20, name: 'Dr. Beto Ruiz', email: 'beto@example.com' },
});

describe('WaitingRoomBoard', () => {
    it('shows the earliest arrival as next patient and the rest of the queue in order', () => {
        render(
            <WaitingRoomBoard
                professionals={[ana]}
                appointments={[
                    buildAppointment({
                        id: 1,
                        patient_name: 'Lucía Fernández',
                        start_at: '2026-08-03T11:00:00',
                        arrived_at: '2026-08-03T10:05:00',
                    }),
                    buildAppointment({
                        id: 2,
                        patient_name: 'María Gómez',
                        start_at: '2026-08-03T10:30:00',
                        arrived_at: '2026-08-03T09:55:00',
                    }),
                ]}
            />,
        );

        const region = screen.getByRole('region', { name: 'Dra. Ana López' });
        expect(within(region).getByText('Próximo paciente')).toBeTruthy();
        expect(within(region).getByText('María G.')).toBeTruthy();
        expect(within(region).getByText('Turno 10:30')).toBeTruthy();
        const rest = within(region).getAllByRole('listitem');
        expect(rest).toHaveLength(1);
        expect(rest[0].textContent).toContain('Lucía F.');
        expect(rest[0].textContent).toContain('Turno 11:00');
    });

    it('never renders the full patient name', () => {
        render(
            <WaitingRoomBoard
                professionals={[ana]}
                appointments={[
                    buildAppointment({ patient_name: 'María Gómez' }),
                ]}
            />,
        );

        expect(screen.queryByText(/Gómez/)).toBeNull();
    });

    it('shows "Nadie en espera" for a professional with nobody waiting', () => {
        render(
            <WaitingRoomBoard
                professionals={[ana, beto]}
                appointments={[buildAppointment({ membership_id: 1 })]}
            />,
        );

        const betoRegion = screen.getByRole('region', {
            name: 'Dr. Beto Ruiz',
        });
        expect(within(betoRegion).getByText('Nadie en espera')).toBeTruthy();
        expect(
            within(
                screen.getByRole('region', { name: 'Dra. Ana López' }),
            ).queryByText('Nadie en espera'),
        ).toBeNull();
    });

    it('has no a11y violations with a populated and an empty queue', async () => {
        const { container } = render(
            <WaitingRoomBoard
                professionals={[ana, beto]}
                appointments={[
                    buildAppointment({ id: 1 }),
                    buildAppointment({
                        id: 2,
                        patient_name: 'Lucía Fernández',
                    }),
                ]}
            />,
        );

        await expectNoA11yViolations(container);
    });

    it('explains the empty roster when there are no professionals', () => {
        render(<WaitingRoomBoard professionals={[]} appointments={[]} />);

        expect(
            screen.getByText(
                'Todavía no hay profesionales en esta organización.',
            ),
        ).toBeTruthy();
    });
});
