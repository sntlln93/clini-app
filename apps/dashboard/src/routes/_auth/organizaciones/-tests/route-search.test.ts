import { defaultParseSearch } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { Route } from '../index';

type Search = Record<string, unknown>;

// `validateSearch`/`loaderDeps` are typed as a union also allowing a non-callable schema-object shape, so narrow back to the function form.
const validateSearch = Route.options.validateSearch as (
    search: Search,
) => Search;
const loaderDeps = Route.options.loaderDeps as (opts: {
    search: Search;
}) => Search;

describe('/organizaciones validateSearch + loaderDeps', () => {
    it('keeps valid filters and defaults q/page in the loader deps', () => {
        const search = validateSearch(
            defaultParseSearch(
                '?status=suspended&subscription_status=none&sort=name&direction=asc&page=2',
            ) as Search,
        );

        expect(search).toMatchObject({
            status: 'suspended',
            subscription_status: 'none',
            sort: 'name',
            direction: 'asc',
            page: 2,
        });
        expect(loaderDeps({ search: validateSearch({}) })).toMatchObject({
            q: '',
            page: 1,
        });
    });

    it('drops an invalid status, subscription status or page instead of throwing', () => {
        const search = validateSearch(
            defaultParseSearch(
                '?status=borrada&subscription_status=gratis&page=abc&q=norte',
            ) as Search,
        );

        expect(search.status).toBeUndefined();
        expect(search.subscription_status).toBeUndefined();
        expect(search.page).toBeUndefined();
        expect(search.q).toBe('norte');
    });

    it('drops a page below 1', () => {
        expect(validateSearch({ page: 0 }).page).toBeUndefined();
    });
});
