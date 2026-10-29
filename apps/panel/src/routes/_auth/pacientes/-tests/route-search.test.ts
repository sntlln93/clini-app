import { defaultParseSearch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { Route } from '../index';

type PatientsSearch = { q?: string; page?: number; vista?: 'tabla' };

// `validateSearch`/`loaderDeps` are typed as a union also allowing a non-callable schema-object shape, so narrow back to the function form.
const validateSearch = Route.options.validateSearch as (
    search: Record<string, unknown>,
) => PatientsSearch;
const loaderDeps = Route.options.loaderDeps as (opts: {
    search: PatientsSearch;
}) => { q: string; page: number; view: 'cards' | 'tabla' };

describe('/pacientes validateSearch + loaderDeps', () => {
    it('validateSearch with an empty object parses to no q/page', () => {
        const parsed = validateSearch({});

        expect(parsed).toEqual({
            q: undefined,
            page: undefined,
            vista: undefined,
        });
    });

    it('loaderDeps falls back to the q/page defaults for an empty search', () => {
        const parsed = validateSearch({});
        const deps = loaderDeps({ search: parsed });

        expect(deps).toEqual({ q: '', page: 1, view: 'cards' });
    });

    it('validateSearch turns a "page=2" URL string into a numeric page of the table', () => {
        // defaultParseSearch decodes the query string and JSON-parses numeric-looking values before validateSearch sees them.
        const decoded = defaultParseSearch('?vista=tabla&page=2') as Record<
            string,
            unknown
        >;

        expect(decoded.page).toBe(2);
        expect(validateSearch(decoded)).toEqual({
            q: undefined,
            page: 2,
            vista: 'tabla',
        });
    });

    it('validateSearch throws for a page that never became numeric (e.g. "abc")', () => {
        const decoded = defaultParseSearch('?vista=tabla&page=abc') as Record<
            string,
            unknown
        >;

        expect(decoded.page).toBe('abc');
        expect(() => validateSearch(decoded)).toThrow();
    });

    // The cards load page after page (#306).
    it('drops the page from the cards view, the default one', () => {
        const decoded = defaultParseSearch('?q=ana&page=3') as Record<
            string,
            unknown
        >;
        const parsed = validateSearch(decoded);

        expect(parsed).toEqual({ q: 'ana', page: undefined, vista: undefined });
        expect(loaderDeps({ search: parsed })).toEqual({
            q: 'ana',
            page: 1,
            view: 'cards',
        });
    });

    it('opens the cards for an unknown view instead of failing the page', () => {
        expect(validateSearch({ vista: 'grilla' }).vista).toBeUndefined();
    });

    it('carries the table view to the loader', () => {
        const parsed = validateSearch({ vista: 'tabla' });

        expect(loaderDeps({ search: parsed }).view).toBe('tabla');
    });
});
