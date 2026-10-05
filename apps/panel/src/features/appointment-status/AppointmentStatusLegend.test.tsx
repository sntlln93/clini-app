import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppointmentStatusLegend } from './AppointmentStatusLegend';

describe('AppointmentStatusLegend', () => {
    it('lists every lifecycle status and the online mark, each with its color dot', () => {
        render(<AppointmentStatusLegend />);

        const legend = screen.getByRole('list', {
            name: 'Referencias de estados',
        });
        const items = within(legend).getAllByRole('listitem');
        expect(items.map((item) => item.textContent)).toEqual([
            'Agendado',
            'Confirmado',
            'Llegó',
            'Completado',
            'Ausente',
            'Reserva online',
        ]);
        expect(items[4].querySelector('span')?.className).toContain(
            'bg-status-no-show',
        );
        expect(items[5].querySelector('span')?.className).toContain(
            'bg-status-online',
        );
    });
});
