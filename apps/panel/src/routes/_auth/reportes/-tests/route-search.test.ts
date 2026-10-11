import { describe, expect, it } from 'vitest';
import { Route } from '../index';

const validateSearch = Route.options.validateSearch as (
    search: Record<string, unknown>,
) => Record<string, unknown>;

describe('/reportes search params', () => {
    it('keeps a range the API accepts', () => {
        expect(
            validateSearch({
                from: '2026-09-01',
                to: '2026-09-30',
                granularity: 'week',
                membershipId: '6',
            }),
        ).toEqual({
            from: '2026-09-01',
            to: '2026-09-30',
            granularity: 'week',
            membershipId: 6,
        });
    });

    it.each([
        ['"Hasta" before "Desde"', { from: '2026-09-30', to: '2026-09-01' }],
        ['more than 366 days', { from: '2025-01-01', to: '2026-01-02' }],
    ])(
        'drops a range the API would reject (%s) back to its default',
        (_label, range) => {
            expect(validateSearch({ ...range, granularity: 'month' })).toEqual({
                from: undefined,
                to: undefined,
                granularity: 'month',
                membershipId: undefined,
            });
        },
    );

    it('drops an impossible date and an unknown granularity', () => {
        expect(
            validateSearch({ from: '2026-02-30', granularity: 'day' }),
        ).toEqual({
            from: undefined,
            to: undefined,
            granularity: undefined,
            membershipId: undefined,
        });
    });
});
