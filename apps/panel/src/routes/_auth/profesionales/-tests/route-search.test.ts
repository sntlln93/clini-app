import { defaultParseSearch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { Route } from '../index';

type ProfessionalsSearch = { q?: string; page?: number };

// `validateSearch`/`loaderDeps` are typed as a union that also allows a
// schema-object shape (not directly callable), even though this route
// always passes a plain function — narrow it back to that for the test.
const validateSearch = Route.options.validateSearch as (
    search: Record<string, unknown>,
) => ProfessionalsSearch;
const loaderDeps = Route.options.loaderDeps as (opts: {
    search: ProfessionalsSearch;
}) => { q: string; page: number };

describe('/profesionales validateSearch + loaderDeps', () => {
    it('validateSearch with an empty object parses to no q/page', () => {
        const parsed = validateSearch({});

        expect(parsed).toEqual({ q: undefined, page: undefined });
    });

    it('loaderDeps falls back to the q/page defaults for an empty search', () => {
        const parsed = validateSearch({});
        const deps = loaderDeps({ search: parsed });

        expect(deps).toEqual({ q: '', page: 1 });
    });

    it('validateSearch turns a "page=2" URL string into a numeric page', () => {
        // The router decodes the raw query string (defaultParseSearch) before
        // handing it to validateSearch, JSON-parsing values that look numeric.
        const decoded = defaultParseSearch('?page=2') as Record<
            string,
            unknown
        >;

        expect(decoded.page).toBe(2);
        expect(validateSearch(decoded)).toEqual({
            q: undefined,
            page: 2,
        });
    });

    it('validateSearch throws for a page that never became numeric (e.g. "abc")', () => {
        const decoded = defaultParseSearch('?page=abc') as Record<
            string,
            unknown
        >;

        expect(decoded.page).toBe('abc');
        expect(() => validateSearch(decoded)).toThrow();
    });
});
