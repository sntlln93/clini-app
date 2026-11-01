import { describe, expect, it } from 'vitest';
import {
    ageAxisOf,
    GROWTH_UNAVAILABLE,
    growthChartOf,
    measurementNear,
} from '../-components/growth-chart';

// Midday UTC: the same calendar day in the practice's zone.
const at = (date: string) => `${date}T15:00:00Z`;
const boy = { birth_date: '2024-03-01', sex: 'm' as const };

describe('growthChartOf', () => {
    it('places each measurement at its age with its WHO percentile', () => {
        // The WHO's P50 and P85 of weight for a boy at 365 and 1000 days.
        const chart = growthChartOf(
            [
                { measuredAt: at('2025-03-01'), value: 9.646 },
                { measuredAt: at('2026-11-26'), value: 15.632 },
            ],
            'weight_kg',
            boy,
        );

        if (chart.status !== 'curves') {
            throw new Error(`Expected curves, got ${chart.status}`);
        }

        expect(chart.sex).toBe('male');
        expect(chart.points.map(({ age }) => age)).toEqual([
            '12 meses',
            '2 años y 8 meses',
        ]);
        expect(chart.points[0].percentile).toBeCloseTo(50, 0);
        expect(chart.points[1].percentile).toBeCloseTo(85, 0);
        expect(chart.domain[0]).toBeLessThan(12);
        expect(chart.domain[1]).toBeGreaterThan(1000 / 30.4375);

        // The curves pass through every row, the patient's included, in order.
        const ages = chart.rows.map(({ ageMonths }) => ageMonths);
        expect(ages).toEqual([...ages].sort((a, b) => a - b));
        const first = chart.rows.find((row) => row.value !== undefined)!;
        expect(first.value).toBe(9.646);
        expect(first.p50).toBeCloseTo(9.646, 3);
        expect(first.p3).toBeCloseTo(7.844, 3);
        expect(chart.rows.every((row) => row.p97 !== undefined)).toBe(true);
    });

    it('uses the curves for girls when the patient is female', () => {
        const chart = growthChartOf(
            [{ measuredAt: at('2025-03-01'), value: 44.894 }],
            'head_circumference_cm',
            { birth_date: '2024-03-01', sex: 'f' },
        );

        expect(chart.status === 'curves' && chart.sex).toBe('female');
        expect(
            chart.status === 'curves' && chart.points[0].percentile,
        ).toBeCloseTo(50, 0);
    });

    it('asks for the birth date, whatever the age', () => {
        expect(
            growthChartOf(
                [{ measuredAt: at('2025-03-01'), value: 9 }],
                'weight_kg',
                { birth_date: null, sex: 'm' },
            ),
        ).toEqual({
            status: 'unavailable',
            reason: GROWTH_UNAVAILABLE.birthDate,
        });
    });

    it('explains that a minor of unknown or missing sex has no curves', () => {
        const series = [{ measuredAt: at('2025-03-01'), value: 9 }];

        expect(
            growthChartOf(series, 'weight_kg', {
                birth_date: '2024-03-01',
                sex: 'u',
            }),
        ).toEqual({ status: 'unavailable', reason: GROWTH_UNAVAILABLE.sex });
        expect(
            growthChartOf(series, 'weight_kg', {
                birth_date: '2024-03-01',
                sex: null,
            }),
        ).toEqual({
            status: 'unavailable',
            reason: GROWTH_UNAVAILABLE.missingSex,
        });
    });

    it('stays quiet for an adult, of known sex or not', () => {
        for (const sex of ['m', 'u'] as const) {
            expect(
                growthChartOf(
                    [{ measuredAt: at('2025-03-01'), value: 70 }],
                    'weight_kg',
                    { birth_date: '1990-03-01', sex },
                ).status,
            ).toBe('none');
        }
    });

    it('says why a minor past the published ages has no weight or head curve', () => {
        const twelve = { birth_date: '2013-01-01', sex: 'f' as const };
        const series = [{ measuredAt: at('2025-03-01'), value: 40 }];

        expect(growthChartOf(series, 'weight_kg', twelve)).toMatchObject({
            status: 'unavailable',
            reason: expect.stringContaining('10 años'),
        });
        expect(
            growthChartOf(series, 'head_circumference_cm', twelve),
        ).toMatchObject({
            status: 'unavailable',
            reason: expect.stringContaining('5 años'),
        });
        expect(growthChartOf(series, 'bmi', twelve).status).toBe('curves');
        expect(growthChartOf(series, 'height_cm', twelve).status).toBe(
            'curves',
        );
    });

    it('keeps a measurement past nineteen without a percentile', () => {
        const chart = growthChartOf(
            [
                { measuredAt: at('2024-06-01'), value: 175 },
                { measuredAt: at('2026-06-01'), value: 176 },
            ],
            'height_cm',
            { birth_date: '2006-03-01', sex: 'm' },
        );

        expect(chart.status).toBe('curves');
        if (chart.status === 'curves') {
            expect(chart.points[0].percentile).not.toBeNull();
            expect(chart.points[1].percentile).toBeNull();
        }
    });

    it('finds the measurement under the pointer, and none far from one', () => {
        const chart = growthChartOf(
            [
                { measuredAt: at('2025-03-01'), value: 9.646 },
                { measuredAt: at('2026-11-26'), value: 15.632 },
            ],
            'weight_kg',
            boy,
        );

        if (chart.status !== 'curves') {
            throw new Error(`Expected curves, got ${chart.status}`);
        }

        expect(measurementNear(chart, 12.3)?.value).toBe(9.646);
        expect(measurementNear(chart, 32.5)?.value).toBe(15.632);
        expect(measurementNear(chart, 22)).toBeUndefined();
    });

    it('leaves the values the WHO has no curves for alone', () => {
        expect(
            growthChartOf(
                [{ measuredAt: at('2025-03-01'), value: 100 }],
                'systolic_mmhg',
                boy,
            ).status,
        ).toBe('none');
    });
});

describe('ageAxisOf', () => {
    it('counts months up to two years', () => {
        const axis = ageAxisOf([0.4, 13]);

        expect(axis.label).toBe('Edad (meses)');
        expect(axis.ticks).toEqual([2, 4, 6, 8, 10, 12]);
        expect(axis.format(6)).toBe('6');
    });

    it('counts years after two years', () => {
        const axis = ageAxisOf([20, 230]);

        expect(axis.label).toBe('Edad (años)');
        expect(axis.ticks).toEqual([36, 72, 108, 144, 180, 216]);
        expect(axis.format(144)).toBe('12');
    });

    it('marks months when the measurements fall between two birthdays', () => {
        for (const domain of [
            [29, 31],
            [86, 94],
        ] as [number, number][]) {
            const axis = ageAxisOf(domain);

            expect(axis.label).toBe('Edad (meses)');
            expect(axis.ticks.length).toBeGreaterThanOrEqual(2);
            expect(
                axis.ticks.every((t) => t >= domain[0] && t <= domain[1]),
            ).toBe(true);
        }
    });
});
