import type { AppointmentStatus } from '@/types/appointment';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppointmentStatusChip } from './AppointmentStatusChip';

const CASES: [AppointmentStatus, string, string][] = [
    ['scheduled', 'Agendado', 'scheduled'],
    ['confirmed', 'Confirmado', 'confirmed'],
    ['arrived', 'Llegó', 'arrived'],
    ['completed', 'Completado', 'completed'],
    ['no_show', 'Ausente', 'no-show'],
    ['cancelled', 'Cancelado', 'scheduled'],
    ['rescheduled', 'Reprogramado', 'scheduled'],
];

describe('AppointmentStatusChip', () => {
    it.each(CASES)(
        'labels %s as "%s" in its status color',
        (status, label, token) => {
            render(<AppointmentStatusChip status={status} />);

            const chip = screen.getByText(label).closest('[data-status]');
            expect(chip?.className).toContain(`bg-status-${token}-wash`);
            expect(chip?.className).toContain(`text-status-${token}`);
            expect(chip?.querySelector('[aria-hidden]')?.className).toContain(
                `bg-status-${token}`,
            );
        },
    );

    it('puts the strong color on a card surface for the appointment blocks', () => {
        render(<AppointmentStatusChip status="arrived" surface="card" />);

        const chip = screen.getByText('Llegó').closest('[data-status]');
        expect(chip?.className).toContain('bg-card');
        expect(chip?.className).toContain('text-status-arrived');
    });

    it('strikes through only the statuses that no longer hold their slot', () => {
        render(
            <>
                <AppointmentStatusChip status="cancelled" />
                <AppointmentStatusChip status="confirmed" />
            </>,
        );

        expect(screen.getByText('Cancelado').className).toContain(
            'line-through',
        );
        expect(screen.getByText('Confirmado').className).not.toContain(
            'line-through',
        );
    });
});
