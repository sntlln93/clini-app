import type { PlatformStats } from '@/types/stats';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppointmentRatesCards } from '../-components/AppointmentRatesCards';

const EMPTY_APPOINTMENTS: PlatformStats['appointments'] = {
    total: 0,
    by_status: {
        scheduled: 0,
        confirmed: 0,
        arrived: 0,
        completed: 0,
        no_show: 0,
        cancelled: 0,
        rescheduled: 0,
    },
    by_origin: { online: 0, manual: 0 },
    cancellation_rate: null,
    no_show_rate: null,
    per_day: [],
};

function cardValue(title: string) {
    return screen
        .getByText(title)
        .closest('[data-slot="card"]')
        ?.querySelector('p')?.textContent;
}

describe('AppointmentRatesCards', () => {
    it('shows "—" for a rate without denominator, never 0 %', () => {
        render(<AppointmentRatesCards appointments={EMPTY_APPOINTMENTS} />);

        expect(cardValue('Tasa de cancelación')).toBe('—');
        expect(cardValue('Tasa de ausentismo')).toBe('—');
    });

    it('formats real rates as percentages', () => {
        render(
            <AppointmentRatesCards
                appointments={{
                    ...EMPTY_APPOINTMENTS,
                    total: 120,
                    cancellation_rate: 0.1034,
                    no_show_rate: 0.0899,
                }}
            />,
        );

        expect(cardValue('Tasa de cancelación')).toBe('10,3%');
        expect(cardValue('Tasa de ausentismo')).toBe('9%');
        expect(cardValue('Turnos en el período')).toBe('120');
    });
});
