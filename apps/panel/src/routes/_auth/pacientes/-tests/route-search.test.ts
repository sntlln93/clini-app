import { defaultParseSearch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { Route } from '../index';

type PatientsSearch = { q?: string; page?: number };

// `validateSearch`/`loaderDeps` are typed as a union also allowing a non-callable schema-object shape, so narrow back to the function form.
const validateSearch = Route.options.validateSearch as (
    search: Record<string, unknown>,
) => PatientsSearch;
const loaderDeps = Route.options.loaderDeps as (opts: {
    search: PatientsSearch;
}) => { q: string; page: number };

describe('/pacientes validateSearch + loaderDeps', () => {
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
        // defaultParseSearch decodes the query string and JSON-parses numeric-looking values before validateSearch sees them.
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
