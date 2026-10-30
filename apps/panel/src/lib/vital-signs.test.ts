import { buildVitalSign } from '@/tests/fixtures/vital-sign';
import { describe, expect, it } from 'vitest';
import {
    formatVitalSignValue,
    latestValues,
    presentValues,
    seriesOf,
} from './vital-signs';

const annulment = {
    reason: 'Otro paciente.',
    created_at: '2026-10-03T13:00:00Z',
};

// Newest first, as the API answers them.
const vitalSigns = [
    buildVitalSign({
        id: 3,
        measured_at: '2026-10-03T13:00:00Z',
        values: { weight_kg: 99, height_cm: null, bmi: null },
        annulment,
    }),
    buildVitalSign({
        id: 2,
        measured_at: '2026-10-02T13:00:00Z',
        values: {
            weight_kg: 72,
            height_cm: null,
            bmi: null,
            temperature_c: 37.5,
        },
    }),
    buildVitalSign({ id: 1, measured_at: '2026-10-01T13:00:00Z' }),
];

describe('vital signs', () => {
    it('formats values with Spanish decimals and their unit, trimmed', () => {
        expect(formatVitalSignValue('weight_kg', 70.5)).toBe('70,5 kg');
        expect(formatVitalSignValue('weight_kg', 70)).toBe('70 kg');
        expect(formatVitalSignValue('oxygen_saturation_pct', 98)).toBe('98 %');
    });

    it('lists only the values a measurement holds, in the page order', () => {
        expect(
            presentValues(vitalSigns[2].values).map((value) => value.label),
        ).toEqual(['Peso', 'Altura', 'IMC']);
    });

    it('takes each value from its latest reading, leaving annulled ones out', () => {
        expect(latestValues(vitalSigns)).toEqual([
            {
                field: 'weight_kg',
                value: 72,
                measuredAt: '2026-10-02T13:00:00Z',
            },
            {
                field: 'height_cm',
                value: 170,
                measuredAt: '2026-10-01T13:00:00Z',
            },
            { field: 'bmi', value: 24.4, measuredAt: '2026-10-01T13:00:00Z' },
            {
                field: 'temperature_c',
                value: 37.5,
                measuredAt: '2026-10-02T13:00:00Z',
            },
        ]);
    });

    it('builds a value series oldest first, without annulled measurements', () => {
        expect(seriesOf(vitalSigns, 'weight_kg')).toEqual([
            { measuredAt: '2026-10-01T13:00:00Z', value: 70.5 },
            { measuredAt: '2026-10-02T13:00:00Z', value: 72 },
        ]);
        expect(seriesOf(vitalSigns, 'height_cm')).toHaveLength(1);
    });
});
