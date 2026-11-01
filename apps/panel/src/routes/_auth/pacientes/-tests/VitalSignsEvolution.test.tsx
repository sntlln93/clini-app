import { buildVitalSign } from '@/tests/fixtures/vital-sign';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GROWTH_UNAVAILABLE } from '../-components/growth-chart';
import { VitalSignsEvolution } from '../-components/VitalSignsEvolution';

// A boy born on 2024-03-01, weighed at 12 months on the WHO's P50 and at
// 1000 days on its P85; newest first, as the API answers.
const weighings = [
    buildVitalSign({
        id: 2,
        measured_at: '2026-11-26T15:00:00Z',
        values: { weight_kg: 15.632, height_cm: null, bmi: null },
    }),
    buildVitalSign({
        id: 1,
        measured_at: '2025-03-01T15:00:00Z',
        values: { weight_kg: 9.646, height_cm: null, bmi: null },
    }),
];

function dataRows() {
    const table = screen.getByRole('table', { hidden: true });

    return within(table)
        .getAllByRole('row', { hidden: true })
        .map((row) => row.textContent);
}

describe('VitalSignsEvolution', () => {
    it("draws a minor's weight against the WHO curves, each measurement with its percentile", () => {
        render(
            <VitalSignsEvolution
                vitalSigns={weighings}
                patient={{ birth_date: '2024-03-01', sex: 'm' }}
            />,
        );

        expect(screen.getByText('P3 y P97')).toBeTruthy();
        expect(screen.getByText(/Curvas de la OMS para niños/)).toBeTruthy();
        expect(dataRows()).toEqual([
            'FechaEdadPesoPercentil',
            expect.stringMatching(/2 años y 8 meses15,63 kgP85$/),
            expect.stringMatching(/12 meses9,65 kgP50$/),
        ]);
    });

    it('explains why there are no curves and keeps the evolution by date', () => {
        render(
            <VitalSignsEvolution
                vitalSigns={weighings}
                patient={{ birth_date: '2024-03-01', sex: 'u' }}
            />,
        );

        expect(screen.getByText(GROWTH_UNAVAILABLE.sex)).toBeTruthy();
        expect(screen.queryByText('P3 y P97')).toBeNull();
        expect(dataRows()[0]).toBe('FechaPeso');
    });

    it("leaves an adult's evolution as it was", () => {
        render(
            <VitalSignsEvolution
                vitalSigns={[buildVitalSign()]}
                patient={{ birth_date: '1990-03-01', sex: 'f' }}
            />,
        );

        expect(screen.queryByText(/OMS/)).toBeNull();
        expect(dataRows()[0]).toBe('FechaPeso');
    });
});
