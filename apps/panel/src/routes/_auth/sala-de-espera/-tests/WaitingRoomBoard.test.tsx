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

// Local time, like the fixtures' offset-less timestamps.
const NOW = new Date('2026-08-03T10:20:00').getTime();

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
                updatedAt={NOW}
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

    it('shows how long each patient has been waiting, relative to the data timestamp', () => {
        render(
            <WaitingRoomBoard
                professionals={[ana]}
                appointments={[
                    buildAppointment({
                        id: 1,
                        arrived_at: '2026-08-03T09:55:00',
                    }),
                    buildAppointment({
                        id: 2,
                        patient_name: 'Lucía Fernández',
                        arrived_at: '2026-08-03T10:15:00',
                    }),
                    buildAppointment({
                        id: 3,
                        patient_name: 'Pedro Sosa',
                        arrived_at: null,
                        start_at: '2026-08-03T10:45:00',
                    }),
                ]}
                updatedAt={NOW}
            />,
        );

        const region = screen.getByRole('region', { name: 'Dra. Ana López' });
        expect(within(region).getByText('Llegó hace 25 min')).toBeTruthy();
        const rest = within(region).getAllByRole('listitem');
        expect(rest[0].textContent).toContain('Llegó hace 5 min');
        expect(rest[1].textContent).not.toContain('Llegó');
    });

    it('keeps the next-patient live region mounted whether or not someone is waiting', () => {
        render(
            <WaitingRoomBoard
                professionals={[ana, beto]}
                appointments={[buildAppointment({ membership_id: 1 })]}
                updatedAt={NOW}
            />,
        );

        const live = (name: string) =>
            screen
                .getByRole('region', { name })
                .querySelector('[aria-live="polite"]');
        expect(live('Dra. Ana López')?.textContent).toContain('Juan P.');
        expect(live('Dra. Ana López')?.textContent).not.toContain('Llegó');
        expect(live('Dr. Beto Ruiz')?.textContent).toBe('Nadie en espera');
    });

    it('never renders the full patient name', () => {
        render(
            <WaitingRoomBoard
                professionals={[ana]}
                appointments={[
                    buildAppointment({ patient_name: 'María Gómez' }),
                ]}
                updatedAt={NOW}
            />,
        );

        expect(screen.queryByText(/Gómez/)).toBeNull();
    });

    it('shows "Nadie en espera" for a professional with nobody waiting', () => {
        render(
            <WaitingRoomBoard
                professionals={[ana, beto]}
                appointments={[buildAppointment({ membership_id: 1 })]}
                updatedAt={NOW}
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
                updatedAt={NOW}
            />,
        );

        await expectNoA11yViolations(container);
    });

    it('explains the empty roster when there are no professionals', () => {
        render(
            <WaitingRoomBoard
                professionals={[]}
                appointments={[]}
                updatedAt={NOW}
            />,
        );

        expect(
            screen.getByText(
                'Todavía no hay profesionales en esta organización.',
            ),
        ).toBeTruthy();
    });
});
