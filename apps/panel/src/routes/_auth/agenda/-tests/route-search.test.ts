import { describe, expect, it } from 'vitest';
import { Route } from '../index';

type AgendaSearch = {
    date?: string;
    view?: 'day' | 'week';
    professionals?: number[];
};

// `validateSearch`/`loaderDeps` are typed as a union that also allows a
// schema-object shape (not directly callable), even though this route
// always passes a plain function — narrow it back to that for the test.
const validateSearch = Route.options.validateSearch as (
    search: Record<string, unknown>,
) => AgendaSearch;
const loaderDeps = Route.options.loaderDeps as (opts: {
    search: AgendaSearch;
}) => { date: string; view: 'day' | 'week' };

describe('/agenda validateSearch + loaderDeps', () => {
    it('validateSearch rejects a view that is neither "day" nor "week"', () => {
        expect(() => validateSearch({ view: 'month' })).toThrow();
    });

    it('validateSearch accepts the two valid view values', () => {
        expect(validateSearch({ view: 'day' })).toEqual({
            date: undefined,
            view: 'day',
        });
        expect(validateSearch({ view: 'week' })).toEqual({
            date: undefined,
            view: 'week',
        });
    });

    it('loaderDeps falls back to today and "day" when date/view are absent', () => {
        const parsed = validateSearch({});
        const deps = loaderDeps({ search: parsed });

        expect(deps.view).toBe('day');
        expect(deps.date).toEqual(expect.any(String));
        expect(deps.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('validateSearch accepts a professionals array and returns the ids as numbers', () => {
        const parsed = validateSearch({ professionals: [1, 2] });

        expect(parsed.professionals).toEqual([1, 2]);
        parsed.professionals?.forEach((id) => expect(typeof id).toBe('number'));
    });

    it('validateSearch rejects a professionals value that is not an array of numbers', () => {
        expect(() => validateSearch({ professionals: ['a'] })).toThrow();
    });

    it('validateSearch accepts a search object with no professionals key (absent means "all selected")', () => {
        const parsed = validateSearch({});

        expect(parsed).not.toHaveProperty('professionals');
    });

    it('loaderDeps does not expose professionals, so the filter never re-triggers the loader', () => {
        const parsed = validateSearch({ professionals: [1, 2] });
        const deps = loaderDeps({ search: parsed });

        expect(Object.keys(deps).sort()).toEqual(['date', 'view']);
    });
});
