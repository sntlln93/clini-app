import { defaultParseSearch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { Route } from '../index';

type ProfessionalsSearch = { q?: string; page?: number; vista?: 'tabla' };

// Cast narrows the union type (which also permits a non-callable schema-object shape) back to the plain function this route always passes.
const validateSearch = Route.options.validateSearch as (
    search: Record<string, unknown>,
) => ProfessionalsSearch;
const loaderDeps = Route.options.loaderDeps as (opts: {
    search: ProfessionalsSearch;
}) => { q: string; page: number; view: 'cards' | 'tabla' };

describe('/profesionales validateSearch + loaderDeps', () => {
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
        // The router JSON-parses numeric-looking values via defaultParseSearch before validateSearch ever sees them.
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
