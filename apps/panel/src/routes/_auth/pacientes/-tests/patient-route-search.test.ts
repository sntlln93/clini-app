import { SEARCH_DEBOUNCE_MS } from '@/features/Searchbar';
import { defaultParseSearch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { Route } from '../$id';

type PatientSearch = { registro?: number };

// Narrowed back to the function form, as in `route-search.test.ts`.
const validateSearch = Route.options.validateSearch as (
    search: Record<string, unknown>,
) => PatientSearch;
const loaderDeps = Route.options.loaderDeps as (opts: {
    search: PatientSearch;
}) => { trailPage: number };

function parse(query: string): PatientSearch {
    return validateSearch(defaultParseSearch(query) as Record<string, unknown>);
}

// #325: the page of the clinical history's access trail lives in the URL.
describe('/pacientes/$id validateSearch + loaderDeps', () => {
    it('opens the most recent page of the trail by default', () => {
        expect(loaderDeps({ search: parse('') })).toEqual({ trailPage: 1 });
    });

    it('reads the page of the trail from «registro»', () => {
        expect(loaderDeps({ search: parse('?registro=3') })).toEqual({
            trailPage: 3,
        });
    });

    it('drops a page that is not one instead of failing the patient page', () => {
        expect(parse('?registro=abc')).toEqual({ registro: undefined });
        expect(parse('?registro=0')).toEqual({ registro: undefined });
    });

    // Paging the trail keeps the patient on screen rather than the skeleton.
    it('waits before swapping the page for its skeleton', () => {
        expect(Route.options.pendingMs).toBe(SEARCH_DEBOUNCE_MS);
    });
});
